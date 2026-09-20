// Validación automática de membresías y features

import { getFirestore } from './firebase';
import { getTenantById } from './tenants';
import { getSubUsers } from './sub-users';

function getDb() {
  return getFirestore();
}

/**
 * Resuelve el ID del plan activo de un tenant (tenant, suscripción o usuario).
 */
export async function resolveTenantMembershipId(tenantId: string): Promise<string | null> {
  const tid = tenantId?.trim();
  if (!tid) return null;

  const tenant = await getTenantById(tid);
  const tenantMembershipId =
    typeof tenant?.membershipId === 'string' ? tenant.membershipId.trim() : '';
  if (tenantMembershipId) return tenantMembershipId;

  try {
    const { getSubscriptionByTenantId } = await import('@autodealers/billing');
    const sub = await getSubscriptionByTenantId(tid);
    const subMembershipId =
      typeof sub?.membershipId === 'string' ? sub.membershipId.trim() : '';
    if (subMembershipId && (sub?.status === 'active' || sub?.status === 'trialing')) {
      return subMembershipId;
    }
  } catch {
    /* non-critical */
  }

  const tenantExtra = tenant as { ownerId?: string } | null;
  const ownerId =
    typeof tenantExtra?.ownerId === 'string' ? tenantExtra.ownerId.trim() : '';
  if (ownerId) {
    const ownerDoc = await getDb().collection('users').doc(ownerId).get();
    const ownerMembershipId =
      typeof ownerDoc.data()?.membershipId === 'string'
        ? ownerDoc.data()!.membershipId.trim()
        : '';
    if (ownerMembershipId) return ownerMembershipId;
  }

  const usersSnap = await getDb()
    .collection('users')
    .where('tenantId', '==', tid)
    .limit(10)
    .get();
  for (const userDoc of usersSnap.docs) {
    const userMembershipId =
      typeof userDoc.data()?.membershipId === 'string'
        ? userDoc.data()!.membershipId.trim()
        : '';
    if (userMembershipId) return userMembershipId;
  }

  return null;
}

/**
 * Features del plan en vivo (siempre lee `memberships/{id}`; sin caché de 1h).
 */
export async function getTenantMembershipFeatures(
  tenantId: string
): Promise<Record<string, unknown> | null> {
  const membership = await getTenantMembership(tenantId);
  if (membership?.features) {
    return membership.features as unknown as Record<string, unknown>;
  }

  const tenant = await getTenantById(tenantId);
  const cached = (tenant as { featuresCache?: Record<string, unknown> } | null)?.featuresCache;
  if (cached && typeof cached === 'object') {
    return cached;
  }

  return null;
}

/**
 * Obtiene la membresía activa de un tenant (lectura fresca desde Firestore).
 */
export async function getTenantMembership(tenantId: string) {
  const membershipId = await resolveTenantMembershipId(tenantId);
  if (!membershipId) {
    return null;
  }

  const { getMembershipById } = await import('@autodealers/billing');
  return await getMembershipById(membershipId);
}

/**
 * Verifica si un tenant tiene una feature específica
 */
export async function tenantHasFeature(
  tenantId: string,
  feature: 'customSubdomain' | 'aiEnabled' | 'socialMediaEnabled' | 'marketplaceEnabled' | 'advancedReports'
): Promise<boolean> {
  const membership = await getTenantMembership(tenantId);
  if (!membership) {
    return false;
  }

  // Import dinámico para evitar dependencia circular
  const billingModule = await import('@autodealers/billing');
  return billingModule.hasFeature(membership, feature);
}

/**
 * Verifica si un tenant puede realizar una acción según su membresía
 */
export async function canPerformAction(
  tenantId: string,
  action:
    | 'createSeller'
    | 'addVehicle'
    | 'addLead'
    | 'useSubdomain'
    | 'useAI'
    | 'useSocialMedia'
    | 'useMarketplace'
    | 'viewAdvancedReports'
): Promise<{ allowed: boolean; reason?: string }> {
  const membership = await getTenantMembership(tenantId);

  if (action === 'addLead') {
    if (!membership) {
      return { allowed: true };
    }
    const billingModule = await import('@autodealers/billing');
    const maxLeads = membership.features?.maxLeadsPerMonth as number | undefined;
    if (maxLeads == null) {
      return { allowed: true };
    }
    const { getLeads } = await import('@autodealers/crm');
    const leads = await getLeads(tenantId, { limit: 5000 });
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const countThisMonth = leads.filter((l) => l.createdAt >= start).length;
    const ok = billingModule.checkLimit(membership, 'maxLeadsPerMonth', countThisMonth);
    if (!ok) {
      return {
        allowed: false,
        reason: `Has alcanzado el máximo de leads nuevos este mes para tu plan (${maxLeads}).`,
      };
    }
    return { allowed: true };
  }

  if (!membership) {
    return { allowed: false, reason: 'No tiene membresía activa' };
  }

  // Import dinámico una sola vez al inicio para evitar dependencia circular
  const billingModule = await import('@autodealers/billing');
  
  switch (action) {
    case 'createSeller':
      const sellers = await getSubUsers(tenantId);
      const canCreate = billingModule.checkLimit(membership, 'maxSellers', sellers.length);
      if (!canCreate) {
        return {
          allowed: false,
          reason: `Límite de vendedores alcanzado (${membership.features.maxSellers})`,
        };
      }
      return { allowed: true };

    case 'addVehicle':
      // Importar dinámicamente para evitar dependencias circulares
      const { getVehicles } = await import('@autodealers/inventory');
      const vehicles = await getVehicles(tenantId);
      const canAdd = billingModule.checkLimit(membership, 'maxInventory', vehicles.length);
      if (!canAdd) {
        return {
          allowed: false,
          reason: `Límite de inventario alcanzado (${membership.features.maxInventory})`,
        };
      }
      return { allowed: true };

    case 'useSubdomain':
      if (!billingModule.hasFeature(membership, 'customSubdomain')) {
        return {
          allowed: false,
          reason: 'Su membresía no incluye subdominio personalizado',
        };
      }
      return { allowed: true };

    case 'useAI':
      if (!billingModule.hasFeature(membership, 'aiEnabled')) {
        return {
          allowed: false,
          reason: 'Su membresía no incluye funciones de IA',
        };
      }
      return { allowed: true };

    case 'useSocialMedia':
      if (!billingModule.hasFeature(membership, 'socialMediaEnabled')) {
        return {
          allowed: false,
          reason: 'Su membresía no incluye integración con redes sociales',
        };
      }
      return { allowed: true };

    case 'useMarketplace':
      if (!billingModule.hasFeature(membership, 'marketplaceEnabled')) {
        return {
          allowed: false,
          reason: 'Su membresía no incluye acceso al marketplace',
        };
      }
      return { allowed: true };

    case 'viewAdvancedReports':
      if (!billingModule.hasFeature(membership, 'advancedReports')) {
        return {
          allowed: false,
          reason: 'Su membresía no incluye reportes avanzados',
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Acción no reconocida' };
  }
}

/**
 * Obtiene todas las features disponibles de un tenant
 */
export async function getTenantFeatures(tenantId: string) {
  const membership = await getTenantMembership(tenantId);
  if (!membership) {
    return {
      customSubdomain: false,
      aiEnabled: false,
      socialMediaEnabled: false,
      marketplaceEnabled: false,
      advancedReports: false,
      maxSellers: 0,
      maxInventory: 0,
    };
  }

  // Import dinámico para evitar dependencia circular
  const billingModule = await import('@autodealers/billing');
  
  return {
    customSubdomain: billingModule.hasFeature(membership, 'customSubdomain'),
    aiEnabled: billingModule.hasFeature(membership, 'aiEnabled'),
    socialMediaEnabled: billingModule.hasFeature(membership, 'socialMediaEnabled'),
    marketplaceEnabled: billingModule.hasFeature(membership, 'marketplaceEnabled'),
    advancedReports: billingModule.hasFeature(membership, 'advancedReports'),
    maxSellers: membership.features.maxSellers,
    maxInventory: membership.features.maxInventory,
  };
}

