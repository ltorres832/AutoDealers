"use strict";
// Core Module - Base del sistema
// Autenticación, autorización, multi-tenancy, usuarios
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminUsers = exports.updateAdminUserPermissions = exports.updateAdminUserStatus = exports.getAdminUserById = exports.deleteLegacyAdminUser = exports.updateLegacyAdminUser = exports.createLegacyAdminUser = exports.hasUserPermission = exports.getTenantByWhatsAppNumber = void 0;
// EXPORTS - FIREBASE PRIMERO (MUY IMPORTANTE)
// Estas funciones antes se re-exportaban aquí. Ahora se deben importar de @autodealers/shared/firebase-server
// o del archivo local lib/firebase-admin.ts
__exportStar(require("./firestore-utils"), exports);
__exportStar(require("./firebase"), exports);
// Resto de exports
__exportStar(require("./auth"), exports);
__exportStar(require("./users"), exports);
__exportStar(require("./tenants"), exports);
var tenants_1 = require("./tenants");
Object.defineProperty(exports, "getTenantByWhatsAppNumber", { enumerable: true, get: function () { return tenants_1.getTenantByWhatsAppNumber; } });
__exportStar(require("./ai-config"), exports);
__exportStar(require("./whatsapp-config"), exports);
__exportStar(require("./seller-management"), exports);
__exportStar(require("./roles"), exports);
// Evitar colisión de nombres: exportar permisos de usuarios con alias
var permissions_1 = require("./permissions");
Object.defineProperty(exports, "hasUserPermission", { enumerable: true, get: function () { return permissions_1.hasPermission; } });
__exportStar(require("./membership-validation"), exports);
__exportStar(require("./storage"), exports);
__exportStar(require("./sub-users"), exports);
__exportStar(require("./auto-responses"), exports);
__exportStar(require("./campaigns"), exports);
__exportStar(require("./faqs"), exports);
__exportStar(require("./social-integrations"), exports);
__exportStar(require("./social-oauth-state"), exports);
__exportStar(require("./meta-oauth-scopes"), exports);
__exportStar(require("./meta-leadgen-map"), exports);
__exportStar(require("./webhook-config"), exports);
__exportStar(require("./social-ai"), exports);
__exportStar(require("./social-ads"), exports);
__exportStar(require("./social-scheduler"), exports);
__exportStar(require("./promotions"), exports);
__exportStar(require("./scheduler"), exports);
__exportStar(require("./scheduler-service"), exports);
__exportStar(require("./ai-config"), exports);
__exportStar(require("./follow-up"), exports);
// Evitar colisión con admin-users-management: export legacy con alias si se requiere
var admin_users_1 = require("./admin-users");
Object.defineProperty(exports, "createLegacyAdminUser", { enumerable: true, get: function () { return admin_users_1.createAdminUser; } });
Object.defineProperty(exports, "updateLegacyAdminUser", { enumerable: true, get: function () { return admin_users_1.updateAdminUser; } });
Object.defineProperty(exports, "deleteLegacyAdminUser", { enumerable: true, get: function () { return admin_users_1.deleteAdminUser; } });
Object.defineProperty(exports, "getAdminUserById", { enumerable: true, get: function () { return admin_users_1.getAdminUserById; } });
Object.defineProperty(exports, "updateAdminUserStatus", { enumerable: true, get: function () { return admin_users_1.updateAdminUserStatus; } });
Object.defineProperty(exports, "updateAdminUserPermissions", { enumerable: true, get: function () { return admin_users_1.updateAdminUserPermissions; } });
var admin_users_2 = require("./admin-users");
Object.defineProperty(exports, "getAdminUsers", { enumerable: true, get: function () { return admin_users_2.getAdminUsers; } });
__exportStar(require("./dealer-admin-users"), exports);
__exportStar(require("./feature-executor"), exports);
__exportStar(require("./feature-sync"), exports);
__exportStar(require("./feature-middleware"), exports);
__exportStar(require("./dynamic-features"), exports);
__exportStar(require("./feature-executor-enhanced"), exports);
__exportStar(require("./communication-templates"), exports);
__exportStar(require("./communication-sender"), exports);
__exportStar(require("./communication-logs"), exports);
__exportStar(require("./credentials"), exports);
__exportStar(require("./stripe-helper"), exports);
__exportStar(require("./admin-permissions"), exports);
__exportStar(require("./admin-users-management"), exports);
__exportStar(require("./pricing-config"), exports);
__exportStar(require("./free-public-listings"), exports);
__exportStar(require("./crm-pipeline-settings"), exports);
__exportStar(require("./quick-listings"), exports);
__exportStar(require("./exclusive-offers-section"), exports);
__exportStar(require("./inventory-finder-cta"), exports);
__exportStar(require("./why-choose-us-section"), exports);
__exportStar(require("./ratings"), exports);
__exportStar(require("./notifications"), exports);
__exportStar(require("./advertisers"), exports);
__exportStar(require("./advertiser-pricing"), exports);
__exportStar(require("./advertiser-limits"), exports);
__exportStar(require("./advertiser-targeting"), exports);
__exportStar(require("./advertiser-ab-testing"), exports);
__exportStar(require("./advertiser-metrics"), exports);
__exportStar(require("./advertiser-specs"), exports);
__exportStar(require("./referrals"), exports);
__exportStar(require("./corporate-email"), exports);
__exportStar(require("./email-aliases"), exports);
__exportStar(require("./multi-dealer-access"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./feature-flags"), exports);
__exportStar(require("./maintenance"), exports);
__exportStar(require("./announcements"), exports);
__exportStar(require("./document-branding"), exports);
__exportStar(require("./pdf-generator"), exports);
__exportStar(require("./policies"), exports);
__exportStar(require("./policy-notifications"), exports);
__exportStar(require("./platform-social"), exports);
__exportStar(require("./registration-facebook-announce"), exports);
