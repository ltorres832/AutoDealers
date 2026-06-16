export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAllSubscriptions } from '@autodealers/billing';
import { enrichPaymentDates } from '@/lib/subscription-api';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    const subscriptions = await getAllSubscriptions(
      status && status !== 'all' ? { status } : undefined
    );

    const { getTenantById, getUserById } = await import('@autodealers/core');
    const { getMembershipById } = await import('@autodealers/billing');

    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const [tenant, user, membership] = await Promise.all([
          getTenantById(sub.tenantId),
          getUserById(sub.userId),
          getMembershipById(sub.membershipId),
        ]);

        return enrichPaymentDates({
          ...sub,
          tenantName: tenant?.name,
          userName: user?.name,
          membershipName: membership?.name,
          amount: membership?.price,
        } as Record<string, unknown>);
      })
    );

    return NextResponse.json({ subscriptions: enrichedSubscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', subscriptions: [] },
      { status: 500 }
    );
  }
}
