/**
 * Selector de Permisos Granulares
 * Permite seleccionar permisos individuales organizados por categorías
 */

import { useState } from 'react';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface PermissionCategory {
  name: string;
  icon: string;
  permissions: Permission[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Dashboard y Estadísticas',
    icon: '📊',
    permissions: [
      { id: 'view_dashboard', name: 'Ver Dashboard', description: 'Acceso al panel principal' },
      { id: 'view_global_stats', name: 'Ver Estadísticas Globales', description: 'Ver métricas generales del sistema' },
    ],
  },
  {
    name: 'Tenants',
    icon: '🏢',
    permissions: [
      { id: 'view_tenants', name: 'Ver Tenants', description: 'Listar y ver detalles de tenants' },
      { id: 'create_tenants', name: 'Crear Tenants', description: 'Crear nuevos tenants' },
      { id: 'edit_tenants', name: 'Editar Tenants', description: 'Modificar información de tenants' },
      { id: 'delete_tenants', name: 'Eliminar Tenants', description: 'Eliminar tenants del sistema' },
      { id: 'manage_tenant_memberships', name: 'Gestionar Membresías de Tenants', description: 'Cambiar planes y membresías' },
    ],
  },
  {
    name: 'Usuarios',
    icon: '👥',
    permissions: [
      { id: 'view_users', name: 'Ver Usuarios', description: 'Listar y ver usuarios regulares' },
      { id: 'create_users', name: 'Crear Usuarios', description: 'Crear nuevos usuarios regulares' },
      { id: 'edit_users', name: 'Editar Usuarios', description: 'Modificar información de usuarios' },
      { id: 'delete_users', name: 'Eliminar Usuarios', description: 'Eliminar usuarios del sistema' },
    ],
  },
  {
    name: 'Usuarios Admin',
    icon: '👨‍💼',
    permissions: [
      { id: 'view_admin_users', name: 'Ver Usuarios Admin', description: 'Listar usuarios con acceso admin' },
      { id: 'create_admin_users', name: 'Crear Usuarios Admin', description: 'Crear nuevos administradores' },
      { id: 'edit_admin_users', name: 'Editar Usuarios Admin', description: 'Modificar administradores' },
      { id: 'delete_admin_users', name: 'Eliminar Usuarios Admin', description: 'Eliminar administradores' },
      { id: 'manage_permissions', name: 'Gestionar Permisos', description: 'Modificar permisos de otros admins' },
    ],
  },
  {
    name: 'Templates de Comunicación',
    icon: '📧',
    permissions: [
      { id: 'view_templates', name: 'Ver Templates', description: 'Ver templates de email/SMS/WhatsApp' },
      { id: 'create_templates', name: 'Crear Templates', description: 'Crear nuevos templates' },
      { id: 'edit_templates', name: 'Editar Templates', description: 'Modificar templates existentes' },
      { id: 'delete_templates', name: 'Eliminar Templates', description: 'Eliminar templates' },
    ],
  },
  {
    name: 'Logs y Notificaciones',
    icon: '📨',
    permissions: [
      { id: 'view_logs', name: 'Ver Logs', description: 'Acceso a logs del sistema' },
      { id: 'view_notifications', name: 'Ver Notificaciones', description: 'Ver notificaciones del sistema' },
    ],
  },
  {
    name: 'Membresías',
    icon: '💳',
    permissions: [
      { id: 'view_memberships', name: 'Ver Membresías', description: 'Listar planes y membresías' },
      { id: 'create_memberships', name: 'Crear Membresías', description: 'Crear nuevos planes' },
      { id: 'edit_memberships', name: 'Editar Membresías', description: 'Modificar planes existentes' },
      { id: 'delete_memberships', name: 'Eliminar Membresías', description: 'Eliminar planes' },
    ],
  },
  {
    name: 'Reportes',
    icon: '📈',
    permissions: [
      { id: 'view_reports', name: 'Ver Reportes', description: 'Acceso a reportes y estadísticas' },
      { id: 'export_reports', name: 'Exportar Reportes', description: 'Descargar reportes en PDF/Excel' },
    ],
  },
  {
    name: 'Campañas y Promociones',
    icon: '📢',
    permissions: [
      { id: 'view_campaigns', name: 'Ver Campañas', description: 'Listar campañas de marketing' },
      { id: 'create_campaigns', name: 'Crear Campañas', description: 'Crear nuevas campañas' },
      { id: 'edit_campaigns', name: 'Editar Campañas', description: 'Modificar campañas existentes' },
      { id: 'delete_campaigns', name: 'Eliminar Campañas', description: 'Eliminar campañas' },
    ],
  },
  {
    name: 'Anunciantes (Advertisers)',
    icon: '📣',
    permissions: [
      { id: 'view_advertisers', name: 'Ver Anunciantes', description: 'Listar y ver anunciantes' },
      { id: 'create_advertisers', name: 'Crear Anunciantes', description: 'Crear nuevos anunciantes' },
      { id: 'edit_advertisers', name: 'Editar Anunciantes', description: 'Modificar información de anunciantes' },
      { id: 'delete_advertisers', name: 'Eliminar Anunciantes', description: 'Eliminar anunciantes' },
      { id: 'manage_advertiser_ads', name: 'Gestionar Anuncios', description: 'Gestionar anuncios de anunciantes' },
      { id: 'approve_advertiser_ads', name: 'Aprobar Anuncios', description: 'Aprobar anuncios pendientes' },
      { id: 'reject_advertiser_ads', name: 'Rechazar Anuncios', description: 'Rechazar anuncios' },
      { id: 'manage_advertiser_billing', name: 'Gestionar Facturación', description: 'Gestionar pagos y facturación' },
      { id: 'view_advertiser_metrics', name: 'Ver Métricas', description: 'Ver estadísticas y métricas de anunciantes' },
    ],
  },
  {
    name: 'Anuncios (Ads)',
    icon: '🎯',
    permissions: [
      { id: 'view_ads', name: 'Ver Anuncios', description: 'Listar y ver anuncios' },
      { id: 'create_ads', name: 'Crear Anuncios', description: 'Crear nuevos anuncios' },
      { id: 'edit_ads', name: 'Editar Anuncios', description: 'Modificar anuncios existentes' },
      { id: 'delete_ads', name: 'Eliminar Anuncios', description: 'Eliminar anuncios' },
      { id: 'publish_ads', name: 'Publicar Anuncios', description: 'Publicar anuncios' },
      { id: 'unpublish_ads', name: 'Despublicar Anuncios', description: 'Despublicar anuncios' },
    ],
  },
  {
    name: 'Sistema de Referidos',
    icon: '🎁',
    permissions: [
      { id: 'view_referrals', name: 'Ver Referidos', description: 'Ver sistema de referidos' },
      { id: 'manage_referrals', name: 'Gestionar Referidos', description: 'Gestionar referidos y códigos' },
      { id: 'view_referral_rewards', name: 'Ver Recompensas', description: 'Ver recompensas de referidos' },
      { id: 'manage_referral_rewards', name: 'Gestionar Recompensas', description: 'Gestionar recompensas y créditos' },
    ],
  },
  {
    name: 'Configuración de Precios',
    icon: '💰',
    permissions: [
      { id: 'view_pricing_config', name: 'Ver Precios', description: 'Ver configuración de precios' },
      { id: 'edit_pricing_config', name: 'Editar Precios', description: 'Modificar precios de planes y servicios' },
    ],
  },
  {
    name: 'Credenciales del Sistema',
    icon: '🔐',
    permissions: [
      { id: 'view_credentials', name: 'Ver Credenciales', description: 'Ver credenciales configuradas' },
      { id: 'edit_credentials', name: 'Editar Credenciales', description: 'Modificar credenciales de servicios externos' },
    ],
  },
  {
    name: 'Integraciones',
    icon: '🔗',
    permissions: [
      { id: 'view_integrations', name: 'Ver Integraciones', description: 'Ver integraciones de redes sociales' },
      { id: 'manage_integrations', name: 'Gestionar Integraciones', description: 'Configurar integraciones' },
    ],
  },
  {
    name: 'Configuración del Sistema',
    icon: '⚙️',
    permissions: [
      { id: 'view_system_settings', name: 'Ver Configuración', description: 'Ver configuración del sistema' },
      { id: 'edit_system_settings', name: 'Editar Configuración', description: 'Modificar configuración del sistema' },
    ],
  },
];

interface PermissionsSelectorProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  rolePermissions?: string[];
}

export function PermissionsSelector({ 
  selectedPermissions, 
  onChange,
  rolePermissions = []
}: PermissionsSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    PERMISSION_CATEGORIES.map(c => c.name)
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(n => n !== categoryName)
        : [...prev, categoryName]
    );
  };

  const togglePermission = (permissionId: string) => {
    const newPermissions = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(p => p !== permissionId)
      : [...selectedPermissions, permissionId];
    onChange(newPermissions);
  };

  const selectAllInCategory = (category: PermissionCategory) => {
    const categoryPermissionIds = category.permissions.map(p => p.id);
    const allSelected = categoryPermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deseleccionar todos
      onChange(selectedPermissions.filter(p => !categoryPermissionIds.includes(p)));
    } else {
      // Seleccionar todos
      const newPermissions = [...new Set([...selectedPermissions, ...categoryPermissionIds])];
      onChange(newPermissions);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <p className="text-sm text-primary-800">
          <strong>💡 Tip:</strong> Los permisos marcados en <span className="text-green-600">verde</span> vienen del rol seleccionado. 
          Puedes agregar permisos adicionales marcando más casillas.
        </p>
      </div>

      {PERMISSION_CATEGORIES.map((category) => {
        const isExpanded = expandedCategories.includes(category.name);
        const categoryPermissionIds = category.permissions.map(p => p.id);
        const selectedInCategory = categoryPermissionIds.filter(id => selectedPermissions.includes(id)).length;
        const totalInCategory = categoryPermissionIds.length;
        const allSelected = selectedInCategory === totalInCategory;

        return (
          <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header de categoría */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                 onClick={() => toggleCategory(category.name)}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedInCategory} de {totalInCategory} permisos seleccionados
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInCategory(category);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-50"
                >
                  {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <span className="text-gray-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* Lista de permisos */}
            {isExpanded && (
              <div className="p-4 space-y-2 bg-white">
                {category.permissions.map((permission) => {
                  const isSelected = selectedPermissions.includes(permission.id);
                  const isFromRole = rolePermissions.includes(permission.id);

                  return (
                    <label
                      key={permission.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? isFromRole
                            ? 'border-green-300 bg-green-50'
                            : 'border-primary-300 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                            {permission.name}
                          </span>
                          {isFromRole && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              Del rol
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Resumen */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Total de permisos seleccionados:</p>
            <p className="text-2xl font-bold text-primary-600">{selectedPermissions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Del rol: {rolePermissions.filter(p => selectedPermissions.includes(p)).length}</p>
            <p className="text-xs text-gray-500">Custom: {selectedPermissions.filter(p => !rolePermissions.includes(p)).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PermissionsSelector;


