export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSelfServiceActiveMemberships, isDealerManagedSeller } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      const response = NextResponse.json(
        {
          error: 'Unauthorized',
          clearCookie: true,
          message: 'Por favor, inicia sesión como vendedor',
        },
        { status: 401 }
      );
      response.cookies.delete('authToken');
      return response;
    }

    if (isDealerManagedSeller(auth.dealerId)) {
      return NextResponse.json({ plans: [], memberships: [], dealerManaged: true });
    }

    const [userDoc, tenantDoc] = await Promise.all([
      db.collection('users').doc(auth.userId).get(),
      db.collection('tenants').doc(auth.tenantId).get(),
    ]);

    const currentMembershipId =
      tenantDoc.data()?.membershipId || userDoc.data()?.membershipId || null;

    const allPlans = await getSelfServiceActiveMemberships('seller');
    const plans = currentMembershipId
      ? allPlans.filter((plan) => plan.id !== currentMembershipId)
      : allPlans;

    return NextResponse.json({ plans, memberships: plans, currentMembershipId });
  } catch (error: unknown) {
    console.error('❌ [SELLER] Error fetching available plans:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, plans: [], memberships: [] }, { status: 500 });
  }
}
