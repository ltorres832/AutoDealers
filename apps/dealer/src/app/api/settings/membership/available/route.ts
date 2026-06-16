import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole, billingTenantId } from '@/lib/auth';
import {
  getSubscriptionByTenantId,
  getMembershipById,
  getSelfServiceActiveMemberships,
} from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let isMultiDealer = false;
    try {
      const subscription = await getSubscriptionByTenantId(
        (billingTenantId(auth) ?? auth.tenantId)!
      );
      if (subscription?.membershipId) {
        const currentMembership = await getMembershipById(subscription.membershipId);
        isMultiDealer = currentMembership?.features?.multiDealerEnabled === true;
      }
    } catch {
      isMultiDealer = false;
    }

    const allMemberships = await getSelfServiceActiveMemberships('dealer');
    const memberships = isMultiDealer
      ? allMemberships.filter((m) => m.features?.multiDealerEnabled === true)
      : allMemberships.filter((m) => !m.features?.multiDealerEnabled);

    return NextResponse.json({
      memberships,
      emptyReason:
        memberships.length === 0
          ? allMemberships.length === 0
            ? 'No hay planes de concesionario en el catálogo. Créalos y actívalos en Admin → Membresías.'
            : 'Hay planes de concesionario pero ninguno está activo. Actívalos en Admin → Membresías.'
          : undefined,
    });
  } catch (error: unknown) {
    console.error('❌ [DEALER] Error fetching available memberships:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, memberships: [] }, { status: 500 });
  }
}
