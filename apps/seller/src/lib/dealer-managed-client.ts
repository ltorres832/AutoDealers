import { isDealerManagedSeller } from './billing-tenant';

/** Vendedor cuya facturación la gestiona el concesionario (no self_service). */
export function isDealerManagedClientUser(
  user: { dealerId?: string | null; billingMode?: string | null } | null | undefined
): boolean {
  return isDealerManagedSeller(user?.dealerId, user?.billingMode);
}
