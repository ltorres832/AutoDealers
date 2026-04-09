/**
 * Reglas para listados del catálogo público (vehículos y vendedores).
 * Centralizado para que API /vehicles, /search y la home se comporten igual.
 */

/** Tenant incluido en catálogo multi-tenant (antes solo status===active; muchos docs no tienen el campo) */
export function isTenantEligibleForPublicCatalog(data: Record<string, unknown>): boolean {
  const s = String(data.status ?? '')
    .toLowerCase()
    .trim();
  if (['inactive', 'suspended', 'deleted', 'disabled', 'cancelled', 'archived'].includes(s)) {
    return false;
  }
  return true;
}

function isPublishedFlagOff(v: { publishedOnPublicPage?: unknown }): boolean {
  if (v.publishedOnPublicPage === false) return true;
  if (String(v.publishedOnPublicPage).toLowerCase() === 'false') return true;
  return false;
}

/** Vehículo listable en APIs públicas (tras traer datos de Firestore) */
export function isVehicleVisibleOnPublicListing(v: {
  status?: string;
  publishedOnPublicPage?: boolean | null;
  deleted?: boolean;
  soldAt?: unknown;
}): boolean {
  if (isPublishedFlagOff(v)) return false;
  if (v.deleted === true) return false;
  if (v.soldAt != null && v.soldAt !== '') return false;

  const st = String(v.status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (['sold', 'deleted', 'inactive', 'reserved'].includes(st)) return false;
  // Legacy: muchos docs sin campo status — listar si no está explícitamente vetado arriba
  if (!st) return true;

  const ok =
    st === 'available' ||
    st === 'disponible' ||
    st === 'in_stock' ||
    st === 'instock' ||
    st === 'listed' ||
    st === 'list' ||
    st === 'public' ||
    st === 'active' ||
    st === 'activo' ||
    st === 'for_sale' ||
    st === 'forsale' ||
    st === 'on_sale';
  if (!ok) return false;
  return true;
}

/**
 * Usuario (seller/dealer) listable en búsqueda pública.
 * Excluir solo estados claramente vetados; `pending`, etc. entran (antes quedaban fuera).
 */
export function isSellerVisibleOnPublicListing(data: Record<string, unknown>): boolean {
  if (data.isActive === false) return false;
  const s = String(data.status ?? '')
    .toLowerCase()
    .trim();
  if (['inactive', 'suspended', 'deleted', 'disabled', 'cancelled', 'archived'].includes(s)) {
    return false;
  }
  return true;
}

/** Misma lógica que sellers (dealers en users/) */
export function isDealerVisibleOnPublicListing(data: Record<string, unknown>): boolean {
  return isSellerVisibleOnPublicListing(data);
}

/**
 * Roles que cuentan como “dealer” en listados públicos.
 * Se consultan por separado (where role == x) para no depender de índices `in` ni omitir filas.
 */
export const PUBLIC_DEALER_USER_ROLES = [
  'dealer',
  'master_dealer',
  'dealer_admin',
  'manager',
] as const;
