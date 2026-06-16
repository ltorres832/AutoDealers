export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReviewInviteByToken, submitReviewFromInvite } from '@autodealers/crm';
import { notifyUser } from '@autodealers/core';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const invite = await getReviewInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: 'Enlace no válido' }, { status: 404 });
    }
    if (invite.status === 'used') {
      return NextResponse.json({ error: 'Este enlace ya fue utilizado', status: 'used' }, { status: 409 });
    }
    if (invite.status === 'expired' || invite.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Enlace expirado', status: 'expired' }, { status: 410 });
    }
    return NextResponse.json({
      providerName: invite.providerName,
      customerNameHint: invite.customerNameHint || null,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error('review-invite GET:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));
    const inviteBefore = await getReviewInviteByToken(token);

    const result = await submitReviewFromInvite({
      token,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      rating: Number(body.rating),
      title: body.title,
      comment: body.comment,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    if (inviteBefore) {
      try {
        await notifyUser(inviteBefore.tenantId, inviteBefore.createdBy, {
          type: 'system_alert',
          title: 'Nueva reseña pendiente de aprobación',
          message: `${body.customerName || 'Un cliente'} envió una evaluación de satisfacción. Revísala y aprueba para publicarla.`,
          metadata: { reviewId: result.reviewId, route: '/reviews' },
        });
      } catch (notifyErr) {
        console.warn('[review-invite notify]', notifyErr);
      }
    }

    return NextResponse.json({ ok: true, reviewId: result.reviewId });
  } catch (e) {
    console.error('review-invite POST:', e);
    return NextResponse.json({ error: 'No se pudo enviar la evaluación' }, { status: 500 });
  }
}
