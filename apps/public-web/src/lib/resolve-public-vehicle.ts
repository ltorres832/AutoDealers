import { getFirestore } from '@autodealers/core';
import { getVehicleById } from '@autodealers/inventory';
import {
  isTenantEligibleForPublicCatalog,
  isVehicleVisibleOnPublicListing,
} from '@/lib/public-catalog-visibility';
import { filterVehiclesForSellerPublicCatalog } from '@/lib/seller-public-catalog';
import { resolvePublicCatalogTenantId } from '@/lib/public-tenant-resolve';
import {
  collectTenantIdsForPublicSeller,
  resolveTenantPrimarySellerId,
} from '@/lib/seller-tenant-scope';

export function isVehicleVisibleOnPublicDetail(
  vehicle: Record<string, unknown>,
  options?: { sellerId?: string | null; tenantPrimarySellerId?: string | null }
): boolean {
  const sellerId = options?.sellerId?.trim();
  if (sellerId) {
    const inSellerCatalog = filterVehiclesForSellerPublicCatalog([vehicle], sellerId, {
      tenantPrimarySellerId: options?.tenantPrimarySellerId?.trim() || sellerId,
    }).length;
    if (inSellerCatalog > 0) return true;
  }
  return isVehicleVisibleOnPublicListing(
    vehicle as Parameters<typeof isVehicleVisibleOnPublicListing>[0]
  );
}

export async function findPublicVehicleById(
  vehicleId: string,
  options?: { hintTenantId?: string | null; sellerId?: string | null }
): Promise<{ vehicle: Record<string, unknown>; tenantId: string } | null> {
  const db = getFirestore();
  const sellerId = options?.sellerId?.trim() || '';
  const hinted = options?.hintTenantId
    ? await resolvePublicCatalogTenantId(options.hintTenantId)
    : null;

  const tenantIdsToTry: string[] = [];
  if (hinted) tenantIdsToTry.push(hinted);

  let tenantPrimarySellerId = '';
  if (sellerId) {
    try {
      const sellerSnap = await db.collection('users').doc(sellerId).get();
      if (sellerSnap.exists) {
        const sellerData = sellerSnap.data() as Record<string, unknown>;
        const primaryTenantId =
          typeof sellerData.tenantId === 'string' ? sellerData.tenantId.trim() : '';
        if (primaryTenantId) {
          const scopeIds = await collectTenantIdsForPublicSeller(
            db,
            sellerId,
            sellerData,
            primaryTenantId
          );
          for (const tid of scopeIds) {
            if (!tenantIdsToTry.includes(tid)) tenantIdsToTry.push(tid);
          }
        }
      }
    } catch {
      // continuar con búsqueda global
    }
  }

  if (hinted) {
    try {
      const tenantSnap = await db.collection('tenants').doc(hinted).get();
      tenantPrimarySellerId = resolveTenantPrimarySellerId(
        tenantSnap.data() as Record<string, unknown> | undefined
      );
    } catch {
      tenantPrimarySellerId = '';
    }
  }

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
      if (
        isVehicleVisibleOnPublicDetail(row, {
          sellerId,
          tenantPrimarySellerId: tenantPrimarySellerId || sellerId,
        })
      ) {
        return { vehicle: row, tenantId: tId };
      }
    } catch {
      // Buscar en el siguiente tenant
    }
  }

  return null;
}
