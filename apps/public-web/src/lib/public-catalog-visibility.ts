/**
 * Reglas para listados del catálogo público (vehículos, dealers, vendedores, ads).
 * Centralizado para que API /vehicles, /search, home, related y ads se comporten igual.
 *
 * Cuentas demo (isDemo / visibility:'demo' / IDs conocidos) NUNCA entran al marketplace.
 * Sus páginas privadas (/promo/..., /dealer/{id}, /seller/{id}) siguen accesibles por URL directa.
 */

import { freeListingExpiresAtMs } from '@autodealers/core';
import { isDemoPromoAccount } from '@/lib/demo-account';

export {
  KNOWN_DEMO_TENANT_IDS,
  KNOWN_DEMO_USER_IDS,
  isKnownDemoId,
  isDemoPromoAccount,
  tenantIdFromResourcePath,
  isDemoResourcePath,
} from '@/lib/demo-account';

/** Tenant incluido en catálogo multi-tenant (antes solo status===active; muchos docs no tienen el campo) */
export function isTenantEligibleForPublicCatalog(
  data: Record<string, unknown>,
  id?: string | null
): boolean {
  if (isDemoPromoAccount(data, id)) return false;
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
  id?: string;
  tenantId?: string;
  sellerId?: string;
  dealerId?: string;
  ownerId?: string;
  status?: string;
  publishedOnPublicPage?: boolean | null;
  deleted?: boolean;
  soldAt?: unknown;
  showPublicSoldBadge?: boolean;
  isFreePublicListing?: boolean;
  freeListingExpiresAt?: unknown;
  tenantHasActiveMembership?: boolean;
}): boolean {
  if (isDemoPromoAccount(v as Record<string, unknown>, v.id)) return false;
  if (v.isFreePublicListing === true && v.tenantHasActiveMembership !== true) {
    const exp = freeListingExpiresAtMs(v.freeListingExpiresAt);
    if (exp != null && exp < Date.now()) return false;
  }
  if (v.deleted === true) return false;

  const st = String(v.status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');

  if (st === 'hidden' || st === 'deleted' || st === 'inactive') return false;

  if (st === 'sold') {
    return v.showPublicSoldBadge === true && !isPublishedFlagOff(v);
  }

  if (isPublishedFlagOff(v)) return false;
  if (v.soldAt != null && v.soldAt !== '') return false;

  if (['reserved'].includes(st)) return false;
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
export function isSellerVisibleOnPublicListing(
  data: Record<string, unknown>,
  id?: string | null
): boolean {
  if (isDemoPromoAccount(data, id)) return false;
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
export function isDealerVisibleOnPublicListing(
  data: Record<string, unknown>,
  id?: string | null
): boolean {
  return isSellerVisibleOnPublicListing(data, id);
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
