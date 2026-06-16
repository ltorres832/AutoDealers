export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSelfServiceActiveMemberships } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userDoc, tenantDoc] = await Promise.all([
      db.collection('users').doc(auth.userId).get(),
      db.collection('tenants').doc(auth.tenantId).get(),
    ]);

    const currentMembershipId =
      tenantDoc.data()?.membershipId || userDoc.data()?.membershipId || null;

    const allPlans = await getSelfServiceActiveMemberships('dealer');
    const plans = currentMembershipId
      ? allPlans.filter((plan) => plan.id !== currentMembershipId)
      : allPlans;

    return NextResponse.json({ plans, currentMembershipId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching available plans:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
