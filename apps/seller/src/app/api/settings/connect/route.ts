import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createTenantConnectOnboardingLink,
  resolveDepositConnectContext,
} from '@autodealers/core';
import { getAppOrigin } from '@/lib/app-origin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const preferred = new URL(request.url).searchParams.get('connectTenantId') || undefined;
    const ctx = await resolveDepositConnectContext({
      role: auth.role,
      tenantId: auth.tenantId,
      userId: auth.userId,
      dealerId: auth.dealerId,
      billingMode: auth.billingMode,
      preferredConnectTenantId: preferred,
    });
    const chosen = ctx.options.find((o) => o.tenantId === ctx.connectTenantId);
    return NextResponse.json({
      connect: ctx,
      ready: chosen?.ready === true,
      canSelfOnboard: ctx.canSelfOnboard,
      label: ctx.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ctx = await resolveDepositConnectContext({
      role: auth.role,
      tenantId: auth.tenantId,
      userId: auth.userId,
      dealerId: auth.dealerId,
      billingMode: auth.billingMode,
      preferredConnectTenantId: body.connectTenantId,
    });

    if (!ctx.canSelfOnboard) {
      return NextResponse.json(
        {
          error:
            'No puedes activar esta cuenta Stripe. Los depósitos van al dealer; pide a tu dealer que active cobros.',
          connect: ctx,
        },
        { status: 403 }
      );
    }

    const origin = getAppOrigin(request);
    const resumeDealId = body.resumeDealId ? String(body.resumeDealId).trim() : '';
    const qs = new URLSearchParams({ connect: 'return' });
    if (resumeDealId) qs.set('resumeDeposit', resumeDealId);
    const refreshQs = new URLSearchParams({ connect: 'refresh' });
    if (resumeDealId) refreshQs.set('resumeDeposit', resumeDealId);

    const link = await createTenantConnectOnboardingLink(
      ctx.connectTenantId,
      `${origin}/deals?${refreshQs.toString()}`,
      `${origin}/deals?${qs.toString()}`
    );

    return NextResponse.json({
      ...link,
      connect: ctx,
      message: 'Te llevamos a activar cobros. Vuelves solo al Deal desk.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[seller connect]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
