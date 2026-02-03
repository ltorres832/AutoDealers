'use client';

import { useState, useEffect } from 'react';
import { SkeletonTable } from '@/components/SkeletonLoader';
import { PermissionsSelector } from '@/components/PermissionsSelector';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const ROLES = {
  super_admin: { name: 'Super Admin', color: 'bg-purple-100 text-purple-800', icon: '👑' },
  admin: { name: 'Administrador', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
  moderator: { name: 'Moderador', color: 'bg-green-100 text-green-800', icon: '✓' },
  viewer: { name: 'Visor', color: 'bg-gray-100 text-gray-800', icon: '👁️' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/admin-users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`¿Eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/admin-users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Usuario eliminado exitosamente');
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar usuario');
    }
  }

  async function handleToggleActive(userId: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/admin/admin-users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar estado');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Usuarios Admin</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>➕</span>
            Crear Usuario Admin
          </button>
        </div>
        <p className="text-gray-600">
          Gestiona los usuarios con acceso al panel de administración y sus permisos
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No hay usuarios admin registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${ROLES[user.role].color}`}>
                      {ROLES[user.role].icon} {ROLES[user.role].name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? '✓ Activo' : '✗ Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString()
                      : 'Nunca'}
                  </td>
                  <td className="px-6 py-4">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        {user.permissions.length} permisos →
                      </summary>
                      <div className="mt-2 bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                        <div className="text-xs space-y-1">
                          {user.permissions.map(perm => (
                            <div key={perm} className="text-gray-700">
                              • {perm.replace(/_/g, ' ').toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'viewer' as 'super_admin' | 'admin' | 'moderator' | 'viewer',
  });
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Permisos base según el rol
  const getRolePermissions = (role: string): string[] => {
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['super_admin'],
      admin: [
        'view_dashboard', 'view_global_stats', 'view_tenants', 'create_tenants', 'edit_tenants',
        'manage_tenant_memberships', 'view_users', 'create_users', 'edit_users',
        'view_templates', 'create_templates', 'edit_templates', 'delete_templates',
        'view_logs', 'view_notifications', 'view_memberships', 'create_memberships',
        'edit_memberships', 'view_reports', 'export_reports', 'view_campaigns',
        'create_campaigns', 'edit_campaigns', 'view_integrations', 'view_system_settings'
      ],
      moderator: [
        'view_dashboard', 'view_tenants', 'view_users', 'view_templates', 'edit_templates',
        'view_logs', 'view_notifications', 'view_reports', 'view_campaigns', 'view_integrations'
      ],
      viewer: [
        'view_dashboard', 'view_tenants', 'view_users', 'view_templates', 'view_logs', 'view_reports'
      ],
    };
    return rolePermissions[role] || [];
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customPermissions,
        }),
      });

      if (response.ok) {
        alert('Usuario creado exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 my-8">
        <h2 className="text-2xl font-bold mb-4">Crear Usuario Admin</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value as any;
                setFormData({ ...formData, role: newRole });
                // Resetear permisos custom cuando cambie el rol
                setCustomPermissions(getRolePermissions(newRole));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="viewer">👁️ Visor - Solo lectura</option>
              <option value="moderator">✓ Moderador - Ver y moderar</option>
              <option value="admin">⚡ Administrador - Gestión completa</option>
              <option value="super_admin">👑 Super Admin - Acceso total</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permisos Detallados
            </label>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              <PermissionsSelector
                selectedPermissions={customPermissions}
                onChange={setCustomPermissions}
                rolePermissions={getRolePermissions(formData.role)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ 
  user, 
  onClose, 
  onSuccess 
}: { 
  user: AdminUser; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  });
  const [customPermissions, setCustomPermissions] = useState<string[]>(user.permissions || []);
  const [loading, setLoading] = useState(false);

  // Permisos base según el rol
  const getRolePermissions = (role: string): string[] => {
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['super_admin'],
      admin: [
        'view_dashboard', 'view_global_stats', 'view_tenants', 'create_tenants', 'edit_tenants',
        'manage_tenant_memberships', 'view_users', 'create_users', 'edit_users',
        'view_templates', 'create_templates', 'edit_templates', 'delete_templates',
        'view_logs', 'view_notifications', 'view_memberships', 'create_memberships',
        'edit_memberships', 'view_reports', 'export_reports', 'view_campaigns',
        'create_campaigns', 'edit_campaigns', 'view_advertisers', 'create_advertisers',
        'edit_advertisers', 'manage_advertiser_ads', 'approve_advertiser_ads', 'reject_advertiser_ads',
        'manage_advertiser_billing', 'view_advertiser_metrics', 'view_ads', 'create_ads',
        'edit_ads', 'delete_ads', 'publish_ads', 'unpublish_ads', 'view_referrals',
        'manage_referrals', 'view_referral_rewards', 'manage_referral_rewards',
        'view_pricing_config', 'edit_pricing_config', 'view_credentials', 'edit_credentials',
        'view_integrations', 'manage_integrations', 'view_system_settings', 'edit_system_settings'
      ],
      moderator: [
        'view_dashboard', 'view_tenants', 'view_users', 'view_templates', 'edit_templates',
        'view_logs', 'view_notifications', 'view_reports', 'view_campaigns', 'view_advertisers',
        'view_ads', 'approve_advertiser_ads', 'reject_advertiser_ads', 'view_referrals', 'view_integrations'
      ],
      viewer: [
        'view_dashboard', 'view_tenants', 'view_users', 'view_templates', 'view_logs', 'view_reports',
        'view_campaigns', 'view_advertisers', 'view_ads', 'view_referrals'
      ],
    };
    return rolePermissions[role] || [];
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/admin-users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customPermissions,
        }),
      });

      if (response.ok) {
        alert('Usuario actualizado exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 my-8">
        <h2 className="text-2xl font-bold mb-4">Editar Usuario Admin</h2>
        
        <div className="bg-gray-50 p-3 rounded mb-4">
          <div className="text-sm text-gray-600">Email:</div>
          <div className="font-medium">{user.email}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value as any;
                setFormData({ ...formData, role: newRole });
                // Actualizar permisos basados en el nuevo rol
                const basePermissions = getRolePermissions(newRole);
                // Mantener permisos custom adicionales si no están en conflicto
                setCustomPermissions([...new Set([...basePermissions, ...customPermissions])]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="viewer">👁️ Visor - Solo lectura</option>
              <option value="moderator">✓ Moderador - Ver y moderar</option>
              <option value="admin">⚡ Administrador - Gestión completa</option>
              <option value="super_admin">👑 Super Admin - Acceso total</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permisos Detallados
            </label>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              <PermissionsSelector
                selectedPermissions={customPermissions}
                onChange={setCustomPermissions}
                rolePermissions={getRolePermissions(formData.role)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Usuario activo
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

