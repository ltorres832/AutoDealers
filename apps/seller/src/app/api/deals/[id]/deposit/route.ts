import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDeal, updateDeal } from '@autodealers/crm';
import {
  createDealDepositCheckoutSession,
  createTenantConnectOnboardingLink,
  getTenantConnectStatus,
  resolveDepositConnectContext,
} from '@autodealers/core';
import { getAppOrigin } from '@/lib/app-origin';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: dealId } = await params;
    const body = await request.json().catch(() => ({}));

    const ctx = await resolveDepositConnectContext({
      role: auth.role,
      tenantId: auth.tenantId,
      userId: auth.userId,
      dealerId: auth.dealerId,
      billingMode: auth.billingMode,
      preferredConnectTenantId: body.connectTenantId,
    });

    const deal = await getDeal(ctx.dealTenantId, dealId);
    if (!deal || deal.sellerId !== auth.userId) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    const amount = Number(body.amount ?? deal.depositAmount);
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Este deal no tiene monto de depósito.' },
        { status: 400 }
      );
    }

    const origin = getAppOrigin(request);
    const connectStatus = await getTenantConnectStatus(ctx.connectTenantId);
    const ready = Boolean(connectStatus.accountId && connectStatus.chargesEnabled);

    if (!ready) {
      if (!ctx.canSelfOnboard) {
        return NextResponse.json(
          {
            needsConnect: true,
            canSelfOnboard: false,
            connect: ctx,
            error: ctx.message,
            message: ctx.message,
          },
          { status: 409 }
        );
      }

      const qs = new URLSearchParams({
        connect: 'return',
        resumeDeposit: dealId,
      });
      if (body.connectTenantId) qs.set('connectTenantId', String(body.connectTenantId));
      const refreshQs = new URLSearchParams({
        connect: 'refresh',
        resumeDeposit: dealId,
      });
      const link = await createTenantConnectOnboardingLink(
        ctx.connectTenantId,
        `${origin}/deals?${refreshQs.toString()}`,
        `${origin}/deals?${qs.toString()}`
      );
      return NextResponse.json({
        needsConnect: true,
        canSelfOnboard: true,
        onboardingUrl: link.url,
        connect: ctx,
        message:
          'Activa cobros una sola vez (datos bancarios). Luego generamos el link de depósito automáticamente.',
      });
    }

    const checkout = await createDealDepositCheckoutSession({
      tenantId: ctx.connectTenantId,
      dealTenantId: ctx.dealTenantId,
      dealId,
      amount,
      currency: deal.currency || 'USD',
      customerEmail: deal.buyer.email,
      customerName: deal.buyer.fullName,
      successUrl: `${origin}/deals?deposit=success&dealId=${dealId}`,
      cancelUrl: `${origin}/deals?deposit=cancel&dealId=${dealId}`,
      description: `Depósito / reserva — ${deal.buyer.fullName}`,
    });

    await updateDeal(ctx.dealTenantId, dealId, {
      status: 'deposit_pending',
      depositAmount: amount,
      depositCheckoutSessionId: checkout.sessionId,
      depositPaymentIntentId: checkout.paymentIntentId || null,
      notes: [deal.notes, `connectTenantId=${ctx.connectTenantId}`].filter(Boolean).join(' | '),
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
      connect: ctx,
      message: `Link listo. El dinero va a: ${ctx.options.find((o) => o.tenantId === ctx.connectTenantId)?.label || ctx.connectTenantId}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[seller deals deposit]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
