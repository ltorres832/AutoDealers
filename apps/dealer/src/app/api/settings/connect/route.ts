import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  createTenantConnectOnboardingLink,
  getTenantConnectStatus,
} from '@autodealers/core';
import { getAppOrigin } from '@/lib/app-origin';

export const dynamic = 'force-dynamic';

/**
 * GET — estado Connect del tenant (listo para cobrar o no).
 * POST — inicia onboarding Express y vuelve al Deal desk (o URL pedida).
 * Body opcional: { returnPath?: string, resumeDealId?: string }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const status = await getTenantConnectStatus(auth.tenantId);
    const ready = Boolean(status.accountId && status.chargesEnabled && status.onboardingComplete);
    return NextResponse.json({
      status,
      ready,
      label: ready
        ? 'Listo para cobrar depósitos'
        : status.accountId
          ? 'Falta terminar la activación de cobros'
          : 'Aún no activaste cobros',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const origin = getAppOrigin(request);
    const resumeDealId = body.resumeDealId ? String(body.resumeDealId).trim() : '';
    const returnPath = String(body.returnPath || '/deals').trim() || '/deals';

    const qs = new URLSearchParams();
    qs.set('connect', 'return');
    if (resumeDealId) qs.set('resumeDeposit', resumeDealId);

    const refreshQs = new URLSearchParams(qs);
    refreshQs.set('connect', 'refresh');

    const base = returnPath.startsWith('/') ? returnPath.split('?')[0] : '/deals';
    const refreshUrl = `${origin}${base}?${refreshQs.toString()}`;
    const returnUrl = `${origin}${base}?${qs.toString()}`;

    const link = await createTenantConnectOnboardingLink(auth.tenantId, refreshUrl, returnUrl);
    return NextResponse.json({
      ...link,
      message:
        'Te llevamos a Stripe solo un momento para activar cobros. Luego vuelves aquí automáticamente.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[connect onboard]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
