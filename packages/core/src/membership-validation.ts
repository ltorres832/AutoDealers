// Validación automática de membresías y features

import { getTenantById } from './tenants';
import { getSubUsers } from './sub-users';

/**
 * Obtiene la membresía activa de un tenant
 */
export async function getTenantMembership(tenantId: string) {
  const tenant = await getTenantById(tenantId);
  if (!tenant || !tenant.membershipId) {
    return null;
  }

  // Import dinámico para evitar dependencia circular
  const { getMembershipById } = await import('@autodealers/billing');
  return await getMembershipById(tenant.membershipId);
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
  action: 'createSeller' | 'addVehicle' | 'useSubdomain' | 'useAI' | 'useSocialMedia' | 'useMarketplace' | 'viewAdvancedReports'
): Promise<{ allowed: boolean; reason?: string }> {
  const membership = await getTenantMembership(tenantId);
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

