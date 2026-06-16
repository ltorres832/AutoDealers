export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionById, getMembershipById } from '@autodealers/billing';
import { getTenantById, getUserById } from '@autodealers/core';
import { enrichPaymentDates } from '@/lib/subscription-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const subscription = await getSubscriptionById(id);

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    const [tenant, user, membership] = await Promise.all([
      getTenantById(subscription.tenantId),
      getUserById(subscription.userId),
      getMembershipById(subscription.membershipId),
    ]);

    const payload = enrichPaymentDates({
      ...subscription,
      tenantName: tenant?.name,
      userName: user?.name,
      membershipName: membership?.name,
      amount: membership?.price,
      membership: membership
        ? { id: membership.id, name: membership.name, type: membership.type, price: membership.price }
        : null,
    } as Record<string, unknown>);

    return NextResponse.json({ subscription: payload });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
