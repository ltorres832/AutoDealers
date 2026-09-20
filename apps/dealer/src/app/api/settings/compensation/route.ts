import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getCompensationSettings,
  saveCompensationSettings,
  DEFAULT_COMPENSATION_RATES,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getCompensationSettings(auth.tenantId);
    return NextResponse.json({ settings, defaults: DEFAULT_COMPENSATION_RATES });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[settings/compensation GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rates = body.rates && typeof body.rates === 'object' ? body.rates : undefined;
    const annualLeaveDays =
      body.annualLeaveDays !== undefined ? Number(body.annualLeaveDays) : undefined;

    const settings = await saveCompensationSettings(
      auth.tenantId,
      {
        rates,
        annualLeaveDays:
          annualLeaveDays !== undefined && Number.isFinite(annualLeaveDays)
            ? Math.max(0, Math.min(365, Math.floor(annualLeaveDays)))
            : undefined,
      },
      auth.userId
    );

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[settings/compensation PUT]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
