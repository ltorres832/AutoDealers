import { getFirestore } from '@autodealers/shared';

function featuresAllowMultiDealer(features: unknown): boolean {
  if (!features || typeof features !== 'object') return false;
  const f = features as Record<string, unknown>;
  return (
    f.multiDealerEnabled === true ||
    f.multiDealerEnabled === 'true' ||
    f.multipleDealers === true ||
    f.multipleDealers === 'true' ||
    f.customMembershipKind === 'multi_dealer'
  );
}

export function isMultiDealerMembershipPlan(features: unknown): boolean {
  return featuresAllowMultiDealer(features);
}

/**
 * Dealer single vs multi-dealer: planes multi solo si la cuenta ya es multi-dealer
 * (membresía actual, flag de usuario/tenant o solicitud aprobada).
 */
export async function isDealerMultiDealerAccount(params: {
  userId?: string;
  tenantId?: string;
  currentMembershipFeatures?: unknown;
}): Promise<boolean> {
  if (featuresAllowMultiDealer(params.currentMembershipFeatures)) return true;

  const db = getFirestore();

  if (params.userId) {
    const userSnap = await db.collection('users').doc(params.userId).get();
    const user = userSnap.data() || {};
    if (user.multiDealerAccess === true) return true;
    if (featuresAllowMultiDealer(user.membershipFeatures)) return true;

    const requestSnap = await db.collection('multi_dealer_requests').doc(params.userId).get();
    if (requestSnap.exists && requestSnap.data()?.status === 'approved') return true;
  }

  if (params.tenantId) {
    const tenantSnap = await db.collection('tenants').doc(params.tenantId).get();
    const tenant = tenantSnap.data() || {};
    if (
      tenant.multiDealerEnabled === true ||
      tenant.isMultiDealer === true ||
      tenant.type === 'multi_dealer'
    ) {
      return true;
    }
    const ownerId = typeof tenant.ownerId === 'string' ? tenant.ownerId : '';
    if (ownerId && ownerId !== params.userId) {
      const ownerReq = await db.collection('multi_dealer_requests').doc(ownerId).get();
      if (ownerReq.exists && ownerReq.data()?.status === 'approved') return true;
      const ownerSnap = await db.collection('users').doc(ownerId).get();
      if (ownerSnap.data()?.multiDealerAccess === true) return true;
    }
  }

  return false;
}

export function filterDealerPlansForAccount<T extends { features?: unknown }>(
  plans: T[],
  isMultiDealer: boolean
): T[] {
  return plans.filter((plan) => {
    const multi = featuresAllowMultiDealer(plan.features);
    return isMultiDealer ? multi : !multi;
  });
}
