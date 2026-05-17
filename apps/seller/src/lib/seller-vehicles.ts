import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/core';
import type { AuthUser } from '@/lib/auth';

export type SellerVehicleRow = Record<string, unknown> & {
  id: string;
  tenantId?: string;
  sellerId?: string;
  assignedTo?: string;
  status?: string;
  deleted?: boolean;
  publishedOnPublicPage?: boolean;
};

function isExcludedStatus(vehicle: SellerVehicleRow): boolean {
  const st = String(vehicle.status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (vehicle.deleted === true) return true;
  if (st === 'sold' || st === 'deleted') return true;
  return false;
}

export function vehicleBelongsToSeller(vehicle: SellerVehicleRow, sellerId: string): boolean {
  return (
    vehicle.sellerId === sellerId ||
    vehicle.assignedTo === sellerId ||
    vehicle.createdBy === sellerId
  );
}

/** Catálogo del vendedor: no filtrar por publishedOnPublicPage (todos los autos del vendedor se muestran). */
export function isPublishedOnPublicPage(_vehicle: SellerVehicleRow): boolean {
  return true;
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

/**
 * Inventario que el vendedor ve en su panel (excluye vendidos / inactivos).
 */
export function filterSellerWorkspaceInventory(
  vehicles: SellerVehicleRow[],
  sellerId: string
): SellerVehicleRow[] {
  const active = vehicles.filter((v) => !isExcludedStatus(v));

  const mine = active.filter((v) => vehicleBelongsToSeller(v, sellerId));
  if (mine.length > 0) return mine;

  const anySellerId = active.some((v) => Boolean(v.sellerId));
  if (anySellerId) return [];

  return active;
}

/** Vehículos que deben aparecer en /seller/[id] y catálogo público del vendedor. */
export function filterSellerPublicCatalogVehicles(
  vehicles: SellerVehicleRow[],
  sellerId: string,
  options?: { tenantPrimarySellerId?: string }
): SellerVehicleRow[] {
  const listable = vehicles.filter((v) => !isExcludedStatus(v));
  const mine = listable.filter((v) => vehicleBelongsToSeller(v, sellerId));
  if (mine.length > 0) return mine;

  const primary = options?.tenantPrimarySellerId?.trim();
  if (primary && primary === sellerId) {
    const orphans = listable.filter((v) => !v.sellerId && !v.assignedTo && !v.createdBy);
    if (orphans.length > 0) return orphans;
  }

  const anySellerId = listable.some((v) => Boolean(v.sellerId));
  if (anySellerId) return [];

  return listable;
}

export function slimVehicleForPreview(v: SellerVehicleRow) {
  return {
    id: v.id,
    make: (v.make as string) || '',
    model: (v.model as string) || '',
    year: typeof v.year === 'number' ? v.year : Number(v.year) || 0,
    price: typeof v.price === 'number' ? v.price : Number(v.price) || 0,
    currency: (v.currency as string) || 'USD',
    mileage: v.mileage as number | undefined,
    condition: (v.condition as string) || 'used',
    photos: (v.photos as string[]) || (v.images as string[]) || [],
    images: (v.images as string[]) || (v.photos as string[]) || [],
    publishedOnPublicPage: isPublishedOnPublicPage(v),
  };
}
