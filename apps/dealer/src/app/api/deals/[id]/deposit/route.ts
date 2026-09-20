import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getDeal, updateDeal } from '@autodealers/crm';
import {
  createDealDepositCheckoutSession,
  createTenantConnectOnboardingLink,
  getTenantConnectStatus,
} from '@autodealers/core';
import { getAppOrigin } from '@/lib/app-origin';

export const dynamic = 'force-dynamic';

/**
 * Genera link de depósito para el comprador.
 * Si Connect no está listo → devuelve onboardingUrl para activar cobros y volver a este deal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: dealId } = await params;
    const deal = await getDeal(auth.tenantId, dealId);
    if (!deal) return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? deal.depositAmount);
    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          error:
            'Este deal no tiene monto de depósito. Edítalo o crea uno nuevo con “Depósito a cobrar”.',
        },
        { status: 400 }
      );
    }

    const origin = getAppOrigin(request);
    const connect = await getTenantConnectStatus(auth.tenantId);
    const ready = Boolean(connect.accountId && connect.chargesEnabled);

    if (!ready) {
      const qs = new URLSearchParams({
        connect: 'return',
        resumeDeposit: dealId,
      });
      const refreshQs = new URLSearchParams({
        connect: 'refresh',
        resumeDeposit: dealId,
      });
      const link = await createTenantConnectOnboardingLink(
        auth.tenantId,
        `${origin}/deals?${refreshQs.toString()}`,
        `${origin}/deals?${qs.toString()}`
      );
      return NextResponse.json({
        needsConnect: true,
        onboardingUrl: link.url,
        accountId: link.accountId,
        message:
          'Primero activa cobros (1–2 min). Stripe pide tus datos bancarios una sola vez; luego creamos el link de depósito solo.',
      });
    }

    const checkout = await createDealDepositCheckoutSession({
      tenantId: auth.tenantId,
      dealTenantId: auth.tenantId,
      dealId,
      amount,
      currency: deal.currency || 'USD',
      customerEmail: deal.buyer.email,
      customerName: deal.buyer.fullName,
      successUrl: `${origin}/deals?deposit=success&dealId=${dealId}`,
      cancelUrl: `${origin}/deals?deposit=cancel&dealId=${dealId}`,
      applicationFeeCents: body.applicationFeeCents != null ? Number(body.applicationFeeCents) : 0,
      description: `Depósito / reserva — ${deal.buyer.fullName}`,
    });

    await updateDeal(auth.tenantId, dealId, {
      status: 'deposit_pending',
      depositAmount: amount,
      depositCheckoutSessionId: checkout.sessionId,
      depositPaymentIntentId: checkout.paymentIntentId || null,
    });

    const buyerPhone = String(deal.buyer.phone || '').replace(/\D/g, '');
    const shareText = encodeURIComponent(
      `Hola ${deal.buyer.fullName}, aquí tienes el link seguro para tu depósito/reserva de $${amount.toFixed(2)}: ${checkout.url}`
    );
    const whatsappUrl = buyerPhone
      ? `https://wa.me/${buyerPhone.startsWith('1') ? buyerPhone : `1${buyerPhone}`}?text=${shareText}`
      : `https://wa.me/?text=${shareText}`;
    const mailtoUrl = deal.buyer.email
      ? `mailto:${encodeURIComponent(deal.buyer.email)}?subject=${encodeURIComponent(
          `Depósito / reserva — $${amount.toFixed(2)}`
        )}&body=${shareText}`
      : null;

    return NextResponse.json({
      needsConnect: false,
      url: checkout.url,
      sessionId: checkout.sessionId,
      amount,
      buyerName: deal.buyer.fullName,
      whatsappUrl,
      mailtoUrl,
      message: 'Link listo. Cópialo o envíalo por WhatsApp / email al comprador.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[deals deposit]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
