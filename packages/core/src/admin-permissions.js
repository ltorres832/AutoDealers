"use strict";
/**
 * Sistema de Permisos para Usuarios Admin
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_ROLES = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
exports.ADMIN_ROLES = {
    super_admin: {
        name: 'Super Administrador',
        description: 'Acceso completo a todas las funciones',
        permissions: ['super_admin'],
    },
    admin: {
        name: 'Administrador',
        description: 'Gestión completa excepto usuarios admin',
        permissions: [
            'view_dashboard',
            'view_global_stats',
            'view_tenants',
            'create_tenants',
            'edit_tenants',
            'manage_tenant_memberships',
            'view_users',
            'create_users',
            'edit_users',
            'view_templates',
            'create_templates',
            'edit_templates',
            'delete_templates',
            'view_logs',
            'view_notifications',
            'view_memberships',
            'create_memberships',
            'edit_memberships',
            'view_reports',
            'export_reports',
            'view_campaigns',
            'create_campaigns',
            'edit_campaigns',
            'view_advertisers',
            'create_advertisers',
            'edit_advertisers',
            'manage_advertiser_ads',
            'approve_advertiser_ads',
            'reject_advertiser_ads',
            'manage_advertiser_billing',
            'view_advertiser_metrics',
            'view_ads',
            'create_ads',
            'edit_ads',
            'delete_ads',
            'publish_ads',
            'unpublish_ads',
            'view_referrals',
            'manage_referrals',
            'view_referral_rewards',
            'manage_referral_rewards',
            'view_pricing_config',
            'edit_pricing_config',
            'view_credentials',
            'edit_credentials',
            'view_integrations',
            'manage_integrations',
            'view_system_settings',
            'edit_system_settings',
        ],
    },
    moderator: {
        name: 'Moderador',
        description: 'Puede ver y moderar contenido',
        permissions: [
            'view_dashboard',
            'view_tenants',
            'view_users',
            'view_templates',
            'edit_templates',
            'view_logs',
            'view_notifications',
            'view_reports',
            'view_campaigns',
            'view_advertisers',
            'view_ads',
            'approve_advertiser_ads',
            'reject_advertiser_ads',
            'view_referrals',
            'view_integrations',
        ],
    },
    viewer: {
        name: 'Visor',
        description: 'Solo puede ver información, sin editar',
        permissions: [
            'view_dashboard',
            'view_tenants',
            'view_users',
            'view_templates',
            'view_logs',
            'view_reports',
            'view_campaigns',
            'view_advertisers',
            'view_ads',
            'view_referrals',
        ],
    },
};
/**
 * Verifica si un usuario tiene un permiso específico
 */
function hasPermission(user, permission) {
    // Super admin tiene todos los permisos
    if (user.permissions.includes('super_admin')) {
        return true;
    }
    return user.permissions.includes(permission);
}
/**
 * Verifica si un usuario tiene alguno de los permisos especificados
 */
function hasAnyPermission(user, permissions) {
    if (user.permissions.includes('super_admin')) {
        return true;
    }
    return permissions.some(p => user.permissions.includes(p));
}
/**
 * Verifica si un usuario tiene todos los permisos especificados
 */
function hasAllPermissions(user, permissions) {
    if (user.permissions.includes('super_admin')) {
        return true;
    }
    return permissions.every(p => user.permissions.includes(p));
}
