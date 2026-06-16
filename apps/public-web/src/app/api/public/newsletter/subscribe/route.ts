export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeNewsletterEmail,
  upsertNewsletterSubscriber,
  getFirestore,
} from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeNewsletterEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const db = getFirestore();
    const docId = email.replace(/[^a-z0-9@._-]/g, '_');
    const existing = await db.collection('newsletter_subscribers').doc(docId).get();
    const alreadySubscribed =
      existing.exists && existing.data()?.status === 'active';

    await upsertNewsletterSubscriber({
      email,
      source: 'landing_footer',
    });

    return NextResponse.json({ ok: true, alreadySubscribed });
  } catch (error: unknown) {
    console.error('[newsletter/subscribe]', error);
    const message = error instanceof Error ? error.message : 'Error al suscribir';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
