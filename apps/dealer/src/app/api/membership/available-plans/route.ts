export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getMembershipById, getSelfServiceActiveMemberships } from '@autodealers/billing';
import {
  filterDealerPlansForAccount,
  getFirestore,
  isDealerMultiDealerAccount,
} from '@autodealers/core';

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

    let currentFeatures: unknown;
    if (currentMembershipId) {
      const current = await getMembershipById(currentMembershipId);
      currentFeatures = current?.features;
    }

    const isMultiDealer = await isDealerMultiDealerAccount({
      userId: auth.userId,
      tenantId: auth.tenantId,
      currentMembershipFeatures: currentFeatures,
    });

    const allPlans = await getSelfServiceActiveMemberships('dealer');
    const catalog = filterDealerPlansForAccount(allPlans, isMultiDealer);
    const plans = currentMembershipId
      ? catalog.filter((plan) => plan.id !== currentMembershipId)
      : catalog;

    return NextResponse.json({ plans, currentMembershipId, isMultiDealer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching available plans:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
