'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DealerAdminUser {
  id: string;
  email: string;
  name: string;
  tenantIds: string[];
  permissions: {
    canManageInventory: boolean;
    canManageLeads: boolean;
    canManageSellers: boolean;
    canManageCampaigns: boolean;
    canManagePromotions: boolean;
    canManageSettings: boolean;
    canManageIntegrations: boolean;
    canViewReports: boolean;
    canManageUsers: boolean;
  };
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: string;
  lastLogin?: string;
}

interface Tenant {
  id: string;
  name: string;
  subdomain?: string;
}

export default function DealerAdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<DealerAdminUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    tenantIds: [] as string[],
    permissions: {
      canManageInventory: true,
      canManageLeads: true,
      canManageSellers: false,
      canManageCampaigns: true,
      canManagePromotions: true,
      canManageSettings: true,
      canManageIntegrations: true,
      canViewReports: true,
      canManageUsers: false,
    },
  });

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/users/admin-users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTenants() {
    try {
      // Obtener todos los tenants del dealer
      const response = await fetch('/api/tenants');
      const data = await response.json();
      setTenants(data.tenants || []);
      
      // Si solo hay un tenant, seleccionarlo por defecto
      if (data.tenants && data.tenants.length === 1) {
        setNewUser({ ...newUser, tenantIds: [data.tenants[0].id] });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function createUser() {
    if (newUser.tenantIds.length === 0) {
      alert('Debes seleccionar al menos un dealer');
      return;
    }

    try {
      const response = await fetch('/api/users/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        alert('Usuario administrador creado exitosamente');
        setShowCreateModal(false);
        setNewUser({
          email: '',
          password: '',
          name: '',
          tenantIds: [],
          permissions: {
            canManageInventory: true,
            canManageLeads: true,
            canManageSellers: false,
            canManageCampaigns: true,
            canManagePromotions: true,
            canManageSettings: true,
            canManageIntegrations: true,
            canViewReports: true,
            canManageUsers: false,
          },
        });
        fetchUsers();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error al crear usuario'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear usuario');
    }
  }

  async function toggleStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const response = await fetch(`/api/users/admin-users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchUsers();
      } else {
        alert('Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar estado');
    }
  }

  function toggleTenant(tenantId: string) {
    setNewUser({
      ...newUser,
      tenantIds: newUser.tenantIds.includes(tenantId)
        ? newUser.tenantIds.filter((id) => id !== tenantId)
        : [...newUser.tenantIds, tenantId],
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Usuarios Administradores</h1>
        <p className="text-gray-600">
          Gestiona usuarios con permisos para administrar tu cuenta/dealer(s)
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Usuario Administrador
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No hay usuarios administradores registrados</p>
            <p className="text-gray-400 text-sm mt-2">Crea el primero para comenzar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dealers Asignados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
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
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {user.tenantIds.length} dealer(s)
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {Object.entries(user.permissions).filter(([_, value]) => value).length} permisos activos
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(user.id, user.status)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      {user.status === 'active' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Crear Usuario Administrador</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="admin@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contraseña</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Dealers a Administrar (selecciona uno o más)
                </label>
                <div className="space-y-2 border rounded p-3 max-h-40 overflow-y-auto">
                  {tenants.map((tenant) => (
                    <label key={tenant.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newUser.tenantIds.includes(tenant.id)}
                        onChange={() => toggleTenant(tenant.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {tenant.name} {tenant.subdomain && `(${tenant.subdomain})`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">Permisos</label>
                <div className="space-y-2">
                  {Object.entries(newUser.permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            permissions: {
                              ...newUser.permissions,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (str) => str.toUpperCase())
                          .trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





