/** Roles que pueden usar la app dealer (compartido cliente + servidor). */
export const DEALER_PORTAL_ROLES = ['dealer', 'master_dealer', 'dealer_admin', 'manager'] as const;

export function isDealerPortalRole(role: string | undefined): boolean {
  if (!role) return false;
  return (DEALER_PORTAL_ROLES as readonly string[]).includes(role);
}

export function isSellerRole(role: string | undefined): boolean {
  return role === 'seller';
}

/** Dealer staff o vendedor (login en la misma app dealer). */
export function canAccessDealerApp(role: string | undefined): boolean {
  return isDealerPortalRole(role) || isSellerRole(role);
}
