import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/shared';
import type { AuthUser } from '@/lib/auth';

export type { SellerVehicleRow } from '@/lib/seller-vehicles-utils';
export {
  vehicleBelongsToSeller,
  filterVehiclesOwnedBySeller,
  isPublishedOnPublicPage,
  filterSellerWorkspaceInventory,
  filterSellerPublicCatalogVehicles,
  slimVehicleForPreview,
} from '@/lib/seller-vehicles-utils';

import type { SellerVehicleRow } from '@/lib/seller-vehicles-utils';
import { vehicleBelongsToSeller } from '@/lib/seller-vehicles-utils';

export async function findSellerVehicleById(
  auth: AuthUser,
  vehicleId: string
): Promise<{ vehicle: SellerVehicleRow; tenantId: string } | null> {
  const all = await loadVehiclesForSellerWorkspace(auth);
  const vehicle = all.find((v) => v.id === vehicleId);
  if (!vehicle || !vehicleBelongsToSeller(vehicle, auth.userId)) {
    return null;
  }
  const tenantId =
    (typeof vehicle.tenantId === 'string' && vehicle.tenantId.trim()) ||
    auth.tenantId;
  return { vehicle, tenantId };
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
