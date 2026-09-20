/** Vendedor creado por un dealer: la suscripción la paga el concesionario. */
export function isDealerManagedSeller(
  dealerId?: string | null,
  billingMode?: string | null
): boolean {
  if (billingMode === 'self_service') return false;
  if (billingMode === 'dealer_managed') return true;
  return Boolean(dealerId?.trim());
}

/**
 * Tenant cuya suscripción determina el acceso a la plataforma.
 * Vendedores con `dealerId` heredan la facturación del concesionario.
 */
export function resolveBillingTenantId(
  tenantId?: string | null,
  dealerId?: string | null,
  billingMode?: string | null
): string | undefined {
  if (isDealerManagedSeller(dealerId, billingMode)) return dealerId!.trim();
  return tenantId?.trim() || undefined;
}

export function getBillingTenantId(auth: {
  tenantId?: string;
  dealerId?: string;
  billingMode?: string;
}): string | undefined {
  return resolveBillingTenantId(auth.tenantId, auth.dealerId, auth.billingMode);
}
