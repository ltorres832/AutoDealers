import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUsageSnapshot, getUsageCharges, currentUsagePeriod } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const period = currentUsagePeriod();
    const [snapshot, charges] = await Promise.all([
      getUsageSnapshot(auth.tenantId, period),
      getUsageCharges(auth.tenantId, { period, limit: 20 }).catch(() => []),
    ]);

    return NextResponse.json({
      period: snapshot.period,
      metrics: snapshot.metrics,
      overageBillingEnabled: snapshot.overageBillingEnabled,
      charges,
    });
  } catch (e) {
    console.error('[usage seller] GET', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
