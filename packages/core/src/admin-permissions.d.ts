/**
 * Sistema de Permisos para Usuarios Admin
 */
export type AdminPermission = 'view_dashboard' | 'view_global_stats' | 'view_tenants' | 'create_tenants' | 'edit_tenants' | 'delete_tenants' | 'manage_tenant_memberships' | 'view_users' | 'create_users' | 'edit_users' | 'delete_users' | 'view_admin_users' | 'create_admin_users' | 'edit_admin_users' | 'delete_admin_users' | 'manage_permissions' | 'view_templates' | 'create_templates' | 'edit_templates' | 'delete_templates' | 'view_logs' | 'view_notifications' | 'view_memberships' | 'create_memberships' | 'edit_memberships' | 'delete_memberships' | 'view_reports' | 'export_reports' | 'view_campaigns' | 'create_campaigns' | 'edit_campaigns' | 'delete_campaigns' | 'view_advertisers' | 'create_advertisers' | 'edit_advertisers' | 'delete_advertisers' | 'manage_advertiser_ads' | 'approve_advertiser_ads' | 'reject_advertiser_ads' | 'manage_advertiser_billing' | 'view_advertiser_metrics' | 'view_ads' | 'create_ads' | 'edit_ads' | 'delete_ads' | 'publish_ads' | 'unpublish_ads' | 'view_referrals' | 'manage_referrals' | 'view_referral_rewards' | 'manage_referral_rewards' | 'view_pricing_config' | 'edit_pricing_config' | 'view_credentials' | 'edit_credentials' | 'view_integrations' | 'manage_integrations' | 'view_system_settings' | 'edit_system_settings' | 'super_admin';
export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
    permissions: AdminPermission[];
    isActive: boolean;
    createdAt: Date;
    createdBy: string;
    lastLogin?: Date;
}
export declare const ADMIN_ROLES: {
    super_admin: {
        name: string;
        description: string;
        permissions: AdminPermission[];
    };
    admin: {
        name: string;
        description: string;
        permissions: AdminPermission[];
    };
    moderator: {
        name: string;
        description: string;
        permissions: AdminPermission[];
    };
    viewer: {
        name: string;
        description: string;
        permissions: AdminPermission[];
    };
};
/**
 * Verifica si un usuario tiene un permiso específico
 */
export declare function hasPermission(user: AdminUser, permission: AdminPermission): boolean;
/**
 * Verifica si un usuario tiene alguno de los permisos especificados
 */
export declare function hasAnyPermission(user: AdminUser, permissions: AdminPermission[]): boolean;
/**
 * Verifica si un usuario tiene todos los permisos especificados
 */
export declare function hasAllPermissions(user: AdminUser, permissions: AdminPermission[]): boolean;
//# sourceMappingURL=admin-permissions.d.ts.map