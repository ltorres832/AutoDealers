export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sendNewsletterCampaign } from '@/lib/newsletter-send-server';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || '').trim();
    const bodyHtml = String(body.bodyHtml || body.content || '').trim();
    const audience = body.audience as 'all_active' | 'newsletter_only' | 'users_only';

    if (!['all_active', 'newsletter_only', 'users_only'].includes(audience)) {
      return NextResponse.json({ error: 'Audiencia inválida.' }, { status: 400 });
    }

    const result = await sendNewsletterCampaign({
      subject,
      bodyHtml,
      sentByUserId: auth.userId,
      audience,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al enviar boletín';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
