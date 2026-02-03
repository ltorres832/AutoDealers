/**
 * Sistema de Permisos para Usuarios Admin
 */

export type AdminPermission =
  // Dashboard y estadísticas
  | 'view_dashboard'
  | 'view_global_stats'
  
  // Tenants
  | 'view_tenants'
  | 'create_tenants'
  | 'edit_tenants'
  | 'delete_tenants'
  | 'manage_tenant_memberships'
  
  // Usuarios
  | 'view_users'
  | 'create_users'
  | 'edit_users'
  | 'delete_users'
  
  // Admin Users
  | 'view_admin_users'
  | 'create_admin_users'
  | 'edit_admin_users'
  | 'delete_admin_users'
  | 'manage_permissions'
  
  // Templates de Comunicación
  | 'view_templates'
  | 'create_templates'
  | 'edit_templates'
  | 'delete_templates'
  
  // Logs y Notificaciones
  | 'view_logs'
  | 'view_notifications'
  
  // Membresías
  | 'view_memberships'
  | 'create_memberships'
  | 'edit_memberships'
  | 'delete_memberships'
  
  // Reportes
  | 'view_reports'
  | 'export_reports'
  
  // Campañas y Promociones
  | 'view_campaigns'
  | 'create_campaigns'
  | 'edit_campaigns'
  | 'delete_campaigns'
  
  // Anunciantes (Advertisers)
  | 'view_advertisers'
  | 'create_advertisers'
  | 'edit_advertisers'
  | 'delete_advertisers'
  | 'manage_advertiser_ads'
  | 'approve_advertiser_ads'
  | 'reject_advertiser_ads'
  | 'manage_advertiser_billing'
  | 'view_advertiser_metrics'
  
  // Anuncios (Ads)
  | 'view_ads'
  | 'create_ads'
  | 'edit_ads'
  | 'delete_ads'
  | 'publish_ads'
  | 'unpublish_ads'
  
  // Sistema de Referidos
  | 'view_referrals'
  | 'manage_referrals'
  | 'view_referral_rewards'
  | 'manage_referral_rewards'
  
  // Configuración de Precios
  | 'view_pricing_config'
  | 'edit_pricing_config'
  
  // Credenciales del Sistema
  | 'view_credentials'
  | 'edit_credentials'
  
  // Integraciones
  | 'view_integrations'
  | 'manage_integrations'
  
  // Configuración del Sistema
  | 'view_system_settings'
  | 'edit_system_settings'
  
  // Super Admin (todos los permisos)
  | 'super_admin';

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

export const ADMIN_ROLES = {
  super_admin: {
    name: 'Super Administrador',
    description: 'Acceso completo a todas las funciones',
    permissions: ['super_admin'] as AdminPermission[],
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
    ] as AdminPermission[],
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
    ] as AdminPermission[],
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
    ] as AdminPermission[],
  },
};

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(user: AdminUser, permission: AdminPermission): boolean {
  // Super admin tiene todos los permisos
  if (user.permissions.includes('super_admin')) {
    return true;
  }
  
  return user.permissions.includes(permission);
}

/**
 * Verifica si un usuario tiene alguno de los permisos especificados
 */
export function hasAnyPermission(user: AdminUser, permissions: AdminPermission[]): boolean {
  if (user.permissions.includes('super_admin')) {
    return true;
  }
  
  return permissions.some(p => user.permissions.includes(p));
}

/**
 * Verifica si un usuario tiene todos los permisos especificados
 */
export function hasAllPermissions(user: AdminUser, permissions: AdminPermission[]): boolean {
  if (user.permissions.includes('super_admin')) {
    return true;
  }
  
  return permissions.every(p => user.permissions.includes(p));
}


