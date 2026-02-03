'use client';

import { useState, useEffect } from 'react';

interface SubUser {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'assistant' | 'viewer';
  permissions: {
    canManageLeads: boolean;
    canManageInventory: boolean;
    canManageCampaigns: boolean;
    canManageMessages: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export default function SubUsersPage() {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSubUsers();
  }, []);

  async function fetchSubUsers() {
    try {
      const response = await fetch('/api/users/sub-users');
      const data = await response.json();
      setSubUsers(data.subUsers || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/users/sub-users/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        fetchSubUsers();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Usuarios Asignados</h1>
          <p className="text-gray-600 mt-2">
            Crea y gestiona usuarios que pueden manejar tu cuenta con los permisos que tú definas.
            Puedes activar o desactivar sus accesos en cualquier momento.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Nuevo Usuario
        </button>
      </div>

      {subUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-xl font-bold mb-2">No hay usuarios asignados</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primer usuario para que te ayude a gestionar tu cuenta
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Crear Primer Usuario
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
              {subUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.canManageLeads && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Leads
                        </span>
                      )}
                      {user.permissions.canManageInventory && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Inventario
                        </span>
                      )}
                      {user.permissions.canManageCampaigns && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Campañas
                        </span>
                      )}
                      {user.permissions.canManageMessages && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Mensajes
                        </span>
                      )}
                      {user.permissions.canViewReports && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Reportes
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={user.isActive}
                        onChange={(e) => toggleStatus(user.id, e.target.checked)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm">
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-primary-600 hover:text-primary-700">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateSubUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchSubUsers}
        />
      )}
    </div>
  );
}

function CreateSubUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'assistant' as 'manager' | 'assistant' | 'viewer',
    permissions: {
      canManageLeads: false,
      canManageInventory: false,
      canManageCampaigns: false,
      canManageMessages: false,
      canViewReports: true,
      canManageSettings: false,
    },
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/users/sub-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  }

  // Actualizar permisos según rol
  function updateRole(role: 'manager' | 'assistant' | 'viewer') {
    const defaultPermissions: Record<string, any> = {
      manager: {
        canManageLeads: true,
        canManageInventory: true,
        canManageCampaigns: true,
        canManageMessages: true,
        canViewReports: true,
        canManageSettings: false,
      },
      assistant: {
        canManageLeads: true,
        canManageInventory: false,
        canManageCampaigns: false,
        canManageMessages: true,
        canViewReports: true,
        canManageSettings: false,
      },
      viewer: {
        canManageLeads: false,
        canManageInventory: false,
        canManageCampaigns: false,
        canManageMessages: false,
        canViewReports: true,
        canManageSettings: false,
      },
    };

    setFormData({
      ...formData,
      role,
      permissions: defaultPermissions[role],
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Nuevo Usuario</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => updateRole(e.target.value as any)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="manager">Manager - Acceso completo</option>
              <option value="assistant">Assistant - Gestión de leads y mensajes</option>
              <option value="viewer">Viewer - Solo lectura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Permisos Personalizados</label>
            <div className="space-y-2 border rounded p-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageLeads}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        canManageLeads: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">Gestionar Leads</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageInventory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        canManageInventory: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">Gestionar Inventario</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageCampaigns}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        canManageCampaigns: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">Gestionar Campañas</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageMessages}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        canManageMessages: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">Gestionar Mensajes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.canViewReports}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: {
                        ...formData.permissions,
                        canViewReports: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">Ver Reportes</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





