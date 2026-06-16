import { getFirestore } from '@autodealers/core';
import { getVehicleById } from '@autodealers/inventory';
import {
  isTenantEligibleForPublicCatalog,
  isVehicleVisibleOnPublicListing,
} from '@/lib/public-catalog-visibility';
import { filterVehiclesForSellerPublicCatalog } from '@/lib/seller-public-catalog';
import { resolvePublicCatalogTenantId } from '@/lib/public-tenant-resolve';

export function isVehicleVisibleOnPublicDetail(
  vehicle: Record<string, unknown>,
  options?: { sellerId?: string | null }
): boolean {
  if (isVehicleVisibleOnPublicListing(vehicle as Parameters<typeof isVehicleVisibleOnPublicListing>[0])) {
    return true;
  }
  const sellerId = options?.sellerId?.trim();
  if (!sellerId) return false;
  return filterVehiclesForSellerPublicCatalog([vehicle], sellerId).length > 0;
}

export async function findPublicVehicleById(
  vehicleId: string,
  options?: { hintTenantId?: string | null; sellerId?: string | null }
): Promise<{ vehicle: Record<string, unknown>; tenantId: string } | null> {
  const db = getFirestore();
  const hinted = options?.hintTenantId
    ? await resolvePublicCatalogTenantId(options.hintTenantId)
    : null;

  const tenantIdsToTry: string[] = [];
  if (hinted) tenantIdsToTry.push(hinted);

  const tenantsSnapshot = await db.collection('tenants').get();
  for (const doc of tenantsSnapshot.docs) {
    if (!isTenantEligibleForPublicCatalog(doc.data() as Record<string, unknown>)) continue;
    if (!tenantIdsToTry.includes(doc.id)) tenantIdsToTry.push(doc.id);
  }

  for (const tId of tenantIdsToTry) {
    try {
      const vehicle = await getVehicleById(tId, vehicleId);
      if (!vehicle) continue;
      const row = {
        ...(vehicle as object),
        id: vehicleId,
        tenantId: tId,
      } as Record<string, unknown>;
      if (isVehicleVisibleOnPublicDetail(row, options)) {
        return { vehicle: row, tenantId: tId };
      }
    } catch {
      // Buscar en el siguiente tenant
    }
  }

  return null;
}
