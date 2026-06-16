/**
 * Importaciones directas del módulo de membresía admin (evita el barrel @autodealers/billing
 * que en App Hosting deja funciones como undefined en el bundle del servidor).
 */
export {
  getAdminMembershipAccessStatus,
  grantAdminMembershipAccess,
  requireAdminMembershipSelection,
  markUserAsAdminProvisioned,
  isAdminProvisionedAccount,
  canAdminControlMembershipBilling,
} from '@autodealers/billing/admin-membership-grant';

export type { AdminMembershipAccessStatus } from '@autodealers/billing/admin-membership-grant';
