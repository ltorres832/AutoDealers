// Core Module - Base del sistema
// Autenticación, autorización, multi-tenancy, usuarios

// EXPORTS - FIREBASE PRIMERO (MUY IMPORTANTE)
// Estas funciones antes se re-exportaban aquí. Ahora se deben importar de @autodealers/shared/firebase-server
// o del archivo local lib/firebase-admin.ts

export * from './firestore-utils';
export * from './firebase';

// Resto de exports
export * from './auth';
export * from './users';
export * from './tenants';
export { getTenantByWhatsAppNumber } from './tenants';
export * from './ai-config';
export * from './whatsapp-config';
export * from './seller-management';
export * from './roles';
// Evitar colisión de nombres: exportar permisos de usuarios con alias
export { hasPermission as hasUserPermission } from './permissions';
export * from './membership-validation';
export * from './storage';
export * from './sub-users';
export * from './auto-responses';
export * from './campaigns';
export * from './faqs';
export * from './social-integrations';
export * from './social-oauth-state';
export * from './platform-social';
export * from './meta-leadgen-map';
export * from './webhook-config';
export * from './social-ai';
export * from './social-ads';
export * from './social-scheduler';
export * from './promotions';
export * from './scheduler';
export * from './scheduler-service';
export * from './ai-config';
export * from './follow-up';
// Evitar colisión con admin-users-management: export legacy con alias si se requiere
export {
  createAdminUser as createLegacyAdminUser,
  updateAdminUser as updateLegacyAdminUser,
  deleteAdminUser as deleteLegacyAdminUser,
  getAdminUserById,
  updateAdminUserStatus,
  updateAdminUserPermissions,
} from './admin-users';
export { getAdminUsers } from './admin-users';
export * from './dealer-admin-users';
export * from './feature-executor';
export * from './feature-sync';
export * from './feature-middleware';
export * from './dynamic-features';
export * from './feature-executor-enhanced';
export * from './communication-templates';
export * from './communication-sender';
export * from './communication-logs';
export * from './credentials';
export * from './stripe-helper';
export * from './admin-permissions';
export * from './admin-users-management';
export * from './pricing-config';
export * from './free-public-listings';
export * from './crm-pipeline-settings';
export * from './quick-listings';
export * from './exclusive-offers-section';
export * from './inventory-finder-cta';
export * from './why-choose-us-section';
export * from './ratings';
export * from './notifications';
export * from './advertisers';
export * from './advertiser-pricing';
export * from './advertiser-limits';
export * from './advertiser-targeting';
export * from './advertiser-ab-testing';
export * from './advertiser-metrics';
export * from './advertiser-specs';
export * from './referrals';
export * from './corporate-email';
export * from './email-aliases';
export * from './multi-dealer-access';
export * from './types';
export * from './feature-flags';
export type { FeatureConfig, DashboardType, DashboardFeatures } from './feature-flags';
export * from './dashboard-feature-membership';
export * from './maintenance';
export * from './announcements';
export * from './document-branding';
export * from './pdf-generator';
export * from './policies';
export * from './policy-notifications';
