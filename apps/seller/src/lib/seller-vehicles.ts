import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/shared';
import type { AuthUser } from '@/lib/auth';

export type { SellerVehicleRow, SellerInventorySyncOptions } from '@/lib/seller-vehicles-utils';
export {
  vehicleBelongsToSeller,
  filterVehiclesOwnedBySeller,
  isPublishedOnPublicPage,
  filterSellerWorkspaceInventory,
  filterSellerPublicCatalogVehicles,
  slimVehicleForPreview,
} from '@/lib/seller-vehicles-utils';

import type { SellerVehicleRow, SellerInventorySyncOptions } from '@/lib/seller-vehicles-utils';
import { vehicleBelongsToSeller } from '@/lib/seller-vehicles-utils';

/** True si el vendedor es dealer-managed (cuenta dada por el dealer, no independiente). */
export function isDealerManagedSellerAuth(auth: AuthUser): boolean {
  if (auth.billingMode === 'self_service') return false;
  if (auth.billingMode === 'dealer_managed') return true;
  return Boolean(auth.dealerId?.trim());
}

/**
 * Preferencias de sincronización de inventario del vendedor.
 * Solo vendedores dealer-managed pueden sincronizar el inventario del dealer.
 */
export async function getSellerInventorySyncOptions(
  auth: AuthUser
): Promise<SellerInventorySyncOptions> {
  if (!auth.dealerId || !isDealerManagedSellerAuth(auth)) {
    return { syncDealerInventory: false };
  }
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const syncDealerInventory = userDoc.data()?.syncDealerInventory === true;
    return { syncDealerInventory, dealerTenantId: auth.dealerId };
  } catch (error) {
    console.warn('getSellerInventorySyncOptions: error leyendo user doc:', error);
    return { syncDealerInventory: false, dealerTenantId: auth.dealerId };
  }
}

export async function findSellerVehicleById(
  auth: AuthUser,
  vehicleId: string,
  options?: {
    /** Permitir vehículos del inventario del dealer (sync activo): venta sí, edición no. */
    allowDealerInventory?: boolean;
  }
): Promise<{ vehicle: SellerVehicleRow; tenantId: string; fromDealerInventory: boolean } | null> {
  const all = await loadVehiclesForSellerWorkspace(auth);
  const vehicle = all.find((v) => v.id === vehicleId);
  if (!vehicle) return null;

  const owned = vehicleBelongsToSeller(vehicle, auth.userId);
  let fromDealerInventory = false;

  if (!owned) {
    if (!options?.allowDealerInventory) return null;
    const sync = await getSellerInventorySyncOptions(auth);
    const isDealerVehicle =
      sync.syncDealerInventory &&
      sync.dealerTenantId &&
      vehicle.tenantId === sync.dealerTenantId;
    if (!isDealerVehicle) return null;
    fromDealerInventory = true;
  }

  const tenantId =
    (typeof vehicle.tenantId === 'string' && vehicle.tenantId.trim()) ||
    auth.tenantId ||
    '';
  return { vehicle, tenantId, fromDealerInventory };
}

/** Misma amplitud que GET /api/vehicles del panel vendedor (tenant + dealer asociados). */
export async function loadVehiclesForSellerWorkspace(auth: AuthUser): Promise<SellerVehicleRow[]> {
  const db = getFirestore();
  const tenantIds = new Set<string>();
  if (auth.tenantId) tenantIds.add(auth.tenantId);
  if (auth.dealerId) tenantIds.add(auth.dealerId);

  const userDoc = await db.collection('users').doc(auth.userId).get();
  const userData = userDoc.data();
  if (userData?.associatedDealers && Array.isArray(userData.associatedDealers)) {
    for (const dealerId of userData.associatedDealers) {
      if (typeof dealerId === 'string' && dealerId.trim()) tenantIds.add(dealerId);
    }
  }

  const merged: SellerVehicleRow[] = [];
  for (const tenantId of tenantIds) {
    const list = await getVehicles(tenantId);
    for (const v of list) {
      merged.push({
        ...(v as unknown as Record<string, unknown>),
        id: v.id,
        tenantId,
      } as SellerVehicleRow);
    }
  }

  return Array.from(new Map(merged.map((v) => [v.id, v])).values());
}
