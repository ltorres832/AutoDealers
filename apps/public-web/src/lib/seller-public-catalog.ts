/**
 * Catálogo público de un vendedor (/seller/[id]).
 * Regla de negocio: mostrar todos los vehículos del vendedor; no ocultar por publishedOnPublicPage ni por estados intermedios.
 */

export function vehicleBelongsToSeller(
  vehicle: Record<string, unknown>,
  sellerId: string
): boolean {
  return (
    vehicle.sellerId === sellerId ||
    vehicle.assignedTo === sellerId ||
    vehicle.createdBy === sellerId
  );
}

/** Visible en catálogo público del vendedor (vendido solo si showPublicSoldBadge). */
export function isVisibleOnSellerPublicCatalog(vehicle: Record<string, unknown>): boolean {
  if (vehicle.deleted === true) return false;
  const st = String(vehicle.status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (st === 'hidden' || st === 'deleted') return false;
  if (st === 'sold') return vehicle.showPublicSoldBadge === true;
  return true;
}

export type SellerPublicCatalogFilterOptions = {
  /** Si el tenant tiene sellerInfo.id = este vendedor, incluir vehículos sin sellerId asignado. */
  tenantPrimarySellerId?: string;
};

export function filterVehiclesForSellerPublicCatalog(
  allVehicles: Record<string, unknown>[],
  sellerId: string,
  options?: SellerPublicCatalogFilterOptions
): Record<string, unknown>[] {
  const listable = allVehicles.filter(isVisibleOnSellerPublicCatalog);
  const mine = listable.filter((v) => vehicleBelongsToSeller(v, sellerId));
  if (mine.length > 0) return mine;

  const primary = options?.tenantPrimarySellerId?.trim();
  if (primary && primary === sellerId) {
    const orphans = listable.filter(
      (v) => !v.sellerId && !v.assignedTo && !v.createdBy
    );
    if (orphans.length > 0) return orphans;
  }

  const anySellerId = listable.some((v) => Boolean(v.sellerId));
  if (anySellerId) return [];

  return listable;
}
