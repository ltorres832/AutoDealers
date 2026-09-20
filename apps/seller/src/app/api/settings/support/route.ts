import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/shared';
import {
  buildPlatformSupportWhatsAppOptions,
  getPlatformSupportContact,
} from '@autodealers/core/platform-support';
import { submitContactInquiry } from '@autodealers/core/contact-inquiries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contact = await getPlatformSupportContact();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};

    return NextResponse.json({
      contact: {
        email: contact.email,
        whatsappOptions: contact.whatsapp
          ? buildPlatformSupportWhatsAppOptions(contact.whatsapp).map(({ id, label, url }) => ({
              id,
              label,
              url,
            }))
          : [],
        hours: contact.hours,
      },
      user: {
        name: String(userData.name || ''),
        email: String(userData.email || auth.email || ''),
        phone: String(userData.phone || ''),
      },
    });
  } catch (error: unknown) {
    console.error('[seller/settings/support GET]', error);
    const msg = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (message.length < 10) {
      return NextResponse.json(
        { error: 'El mensaje debe tener al menos 10 caracteres' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data() || {};

    const name = String(userData.name || auth.email || 'Usuario').trim();
    const email = String(userData.email || auth.email || '').trim().toLowerCase();
    const phone = userData.phone ? String(userData.phone).trim() : null;

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Email de usuario no válido' }, { status: 400 });
    }

    const { id } = await submitContactInquiry({
      name,
      email,
      phone,
      message,
      businessType: 'seller',
      source: 'seller_app_support',
    });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('[seller/settings/support POST]', error);
    const msg = error instanceof Error ? error.message : 'Error al enviar mensaje';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
