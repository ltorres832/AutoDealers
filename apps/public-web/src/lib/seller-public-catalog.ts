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
  /** Vendedor dealer-managed con sync activo: incluir todo el inventario del dealer. */
  syncDealerInventory?: boolean;
  /** Tenant del dealer cuyo inventario completo se sincroniza. */
  dealerTenantId?: string;
};

export function filterVehiclesForSellerPublicCatalog(
  allVehicles: Record<string, unknown>[],
  sellerId: string,
  options?: SellerPublicCatalogFilterOptions
): Record<string, unknown>[] {
  const listable = allVehicles.filter(isVisibleOnSellerPublicCatalog);
  const mine = listable.filter((v) => vehicleBelongsToSeller(v, sellerId));

  // Sync activo: catálogo del vendedor = sus vehículos + todo el inventario del dealer
  if (options?.syncDealerInventory && options.dealerTenantId) {
    const mineIds = new Set(mine.map((v) => v.id));
    const dealerInventory = listable.filter(
      (v) => v.tenantId === options.dealerTenantId && !mineIds.has(v.id)
    );
    return [...mine, ...dealerInventory];
  }

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

/** Misma regla que /seller/[id] y web azul del vendedor — para contadores en listados. */
export function countSellerPublicCatalogVehicles(
  allVehicles: Record<string, unknown>[],
  sellerId: string,
  options?: SellerPublicCatalogFilterOptions
): number {
  return filterVehiclesForSellerPublicCatalog(allVehicles, sellerId, options).length;
}
