/** Utilidades puras de inventario del vendedor (seguras para el bundle del cliente). */

export type SellerVehicleRow = Record<string, unknown> & {
  id: string;
  tenantId?: string;
  sellerId?: string;
  assignedTo?: string;
  createdBy?: string;
  status?: string;
  deleted?: boolean;
  publishedOnPublicPage?: boolean;
};

/** Opciones de sincronización de inventario del dealer (vendedores dealer-managed). */
export type SellerInventorySyncOptions = {
  /** El vendedor activó "sincronizar todo el inventario del dealer". */
  syncDealerInventory?: boolean;
  /** Tenant del dealer cuya totalidad de inventario se sincroniza. */
  dealerTenantId?: string;
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

function isHidden(vehicle: SellerVehicleRow): boolean {
  return (
    String(vehicle.status ?? '')
      .toLowerCase()
      .trim() === 'hidden'
  );
}

/** True si la fila vive en el tenant del dealer (documento controlado por el dealer). */
function isDealerRow(vehicle: SellerVehicleRow, dealerTenantId?: string): boolean {
  return Boolean(dealerTenantId && vehicle.tenantId === dealerTenantId);
}

export function vehicleBelongsToSeller(vehicle: SellerVehicleRow, sellerId: string): boolean {
  const id = sellerId.trim();
  if (!id) return false;
  return (
    vehicle.sellerId === id ||
    vehicle.assignedTo === id ||
    vehicle.createdBy === id
  );
}

/** Solo vehículos del vendedor — sin fallback al inventario completo del dealer. */
export function filterVehiclesOwnedBySeller(
  vehicles: SellerVehicleRow[],
  sellerId: string
): SellerVehicleRow[] {
  return vehicles.filter((v) => vehicleBelongsToSeller(v, sellerId));
}

/** Catálogo del vendedor: no filtrar por publishedOnPublicPage (todos los autos del vendedor se muestran). */
export function isPublishedOnPublicPage(_vehicle: SellerVehicleRow): boolean {
  return true;
}

/**
 * Inventario que el vendedor ve en su panel (excluye vendidos / inactivos).
 * Con sync activo incluye además todo el inventario listable del dealer.
 * Los vehículos que viven en el tenant del dealer y están ocultos NO se muestran
 * (el vendedor no controla ese documento).
 */
export function filterSellerWorkspaceInventory(
  vehicles: SellerVehicleRow[],
  sellerId: string,
  options?: SellerInventorySyncOptions
): SellerVehicleRow[] {
  const dealerTenantId = options?.dealerTenantId;
  const owned = filterVehiclesOwnedBySeller(vehicles, sellerId).filter((v) => {
    if (isExcludedStatus(v)) return false;
    // Oculto por el dealer en el tenant del dealer → no visible para el vendedor
    if (isDealerRow(v, dealerTenantId) && isHidden(v)) return false;
    return true;
  });

  if (!options?.syncDealerInventory || !dealerTenantId) return owned;

  const ownedIds = new Set(owned.map((v) => v.id));
  const dealerInventory = vehicles.filter(
    (v) =>
      isDealerRow(v, dealerTenantId) &&
      !ownedIds.has(v.id) &&
      !isExcludedStatus(v) &&
      !isHidden(v)
  );
  return [...owned, ...dealerInventory];
}

/** Vehículos que deben aparecer en /seller/[id] y catálogo público del vendedor. */
export function filterSellerPublicCatalogVehicles(
  vehicles: SellerVehicleRow[],
  sellerId: string,
  options?: { tenantPrimarySellerId?: string } & SellerInventorySyncOptions
): SellerVehicleRow[] {
  const dealerTenantId = options?.dealerTenantId;
  const listable = vehicles.filter((v) => {
    if (isExcludedStatus(v)) return false;
    if (isDealerRow(v, dealerTenantId) && isHidden(v)) return false;
    return true;
  });
  const mine = listable.filter((v) => vehicleBelongsToSeller(v, sellerId));

  // Sync activo: el catálogo del vendedor incluye todo el inventario del dealer
  if (options?.syncDealerInventory && dealerTenantId) {
    const mineIds = new Set(mine.map((v) => v.id));
    const dealerInventory = listable.filter(
      (v) => isDealerRow(v, dealerTenantId) && !mineIds.has(v.id)
    );
    return [...mine, ...dealerInventory];
  }

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
