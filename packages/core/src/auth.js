"use strict";
// Autenticación y autorización
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = hasRole;
exports.hasTenantAccess = hasTenantAccess;
exports.canAccessSeller = canAccessSeller;
/**
 * Verifica si un usuario tiene un rol específico
 */
function hasRole(context, role) {
    return context.role === role;
}
/**
 * Verifica si un usuario tiene acceso a un tenant
 */
function hasTenantAccess(context, tenantId) {
    // Admin tiene acceso a todos
    if (context.role === 'admin') {
        return true;
    }
    // Dealer/Seller solo a su propio tenant
    return context.tenantId === tenantId;
}
/**
 * Verifica si un dealer puede acceder a un vendedor
 */
function canAccessSeller(context, sellerTenantId, sellerDealerId) {
    if (context.role === 'admin') {
        return true;
    }
    if (context.role === 'dealer' && context.tenantId) {
        return sellerDealerId === context.tenantId;
    }
    return false;
}
