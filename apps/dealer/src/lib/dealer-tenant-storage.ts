/** sessionStorage: tenant cuyo contexto muestra el dashboard (sede propia o asociada). */
export const DEALER_ACTIVE_TENANT_KEY = 'dealerActiveTenantId';

/**
 * Tenant efectivo para subcolecciones Firestore en el cliente.
 * Debe coincidir con el header `X-Dealer-Tenant-Id` que envía `fetchWithAuth`.
 */
export function getDealerActiveTenantId(fallback?: string | null): string | undefined {
  if (typeof window === 'undefined') {
    const t = fallback?.trim();
    return t || undefined;
  }
  try {
    const active = sessionStorage.getItem(DEALER_ACTIVE_TENANT_KEY)?.trim();
    if (active) return active;
  } catch {
    /* ignore */
  }
  const t = fallback?.trim();
  return t || undefined;
}