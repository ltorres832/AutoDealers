import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import {
  getMembershipById,
  getSelfServiceActiveMemberships,
  getSubscriptionByTenantId,
} from '@autodealers/billing';
import { serializeMembershipForApi } from '@autodealers/billing/membership-coerce';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getFirestore();
  const [tenantSnap, userSnap, plans, subscription] = await Promise.all([
    db.collection('tenants').doc(auth.tenantId).get(),
    db.collection('users').doc(auth.userId).get(),
    getSelfServiceActiveMemberships('business'),
    getSubscriptionByTenantId(auth.tenantId),
  ]);

  const tenant = tenantSnap.data() || {};
  const user = userSnap.data() || {};
  const membershipId = String(tenant.membershipId || user.membershipId || subscription?.membershipId || '');
  const current = membershipId ? await getMembershipById(membershipId) : null;

  return NextResponse.json({
    current: current
      ? serializeMembershipForApi(current as unknown as Record<string, unknown> & { id: string })
      : null,
    plans: plans.map((m) =>
      serializeMembershipForApi(m as unknown as Record<string, unknown> & { id: string })
    ),
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          billingSource: subscription.billingSource || null,
          currentPeriodEnd: subscription.currentPeriodEnd || null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
        }
      : null,
  });
}
