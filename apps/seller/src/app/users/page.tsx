'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'assistant' | 'manager';
  status: string;
  permissions?: {
    canManageInventory?: boolean;
    canManageLeads?: boolean;
    canManageIntegrations?: boolean;
    canManageTemplates?: boolean;
    canViewReports?: boolean;
    canManageAppointments?: boolean;
    canManageCampaigns?: boolean;
    canManageMessages?: boolean;
  };
  createdAt: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">
            Crea usuarios gestores/asistentes para que manejen tu cuenta con los permisos que les otorgues
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Usuario Gestor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <span
                className={`px-3 py-1 rounded text-xs ${
                  user.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {user.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Rol:</p>
              <p className="font-medium">
                {user.role === 'assistant' ? '👤 Asistente' : '👨‍💼 Gestor'}
              </p>
            </div>

            {user.permissions && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Permisos:</p>
                <div className="flex flex-wrap gap-1">
                  {user.permissions.canManageInventory && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Inventario</span>
                  )}
                  {user.permissions.canManageLeads && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Leads</span>
                  )}
                  {user.permissions.canManageIntegrations && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Integraciones</span>
                  )}
                  {user.permissions.canManageTemplates && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">Templates</span>
                  )}
                  {user.permissions.canViewReports && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">Reportes</span>
                  )}
                  {user.permissions.canManageAppointments && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Citas</span>
                  )}
                  {user.permissions.canManageCampaigns && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Campañas</span>
                  )}
                  {user.permissions.canManageMessages && (
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded">Mensajes</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Editar
              </button>
              <button
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No hay usuarios gestores creados</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Crear primer usuario gestor
            </button>
          </div>
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
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'assistant' as 'assistant' | 'manager',
    permissions: {
      canManageInventory: false,
      canManageLeads: false,
      canManageIntegrations: false,
      canManageTemplates: false,
      canViewReports: false,
      canManageAppointments: false,
      canManageCampaigns: false,
      canManageMessages: false,
    },
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validar que al menos un permiso esté seleccionado
    if (Object.values(formData.permissions).every(p => !p)) {
      alert('Debes seleccionar al menos un permiso para el usuario');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Usuario Gestor</h2>
          <p className="text-sm text-gray-600 mt-1">
            Crea un usuario que pueda gestionar tu cuenta con los permisos que le otorgues
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña *</label>
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
            <label className="block text-sm font-medium mb-2">Rol *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="assistant">Asistente - Puede gestionar la cuenta con permisos limitados</option>
              <option value="manager">Gestor - Puede gestionar la cuenta con permisos amplios</option>
            </select>
          </div>

          {/* Permisos */}
          <div>
            <label className="block text-sm font-medium mb-2">Permisos *</label>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona qué acciones puede realizar este usuario
            </p>
            <div className="space-y-3 border rounded p-4 bg-gray-50">
              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageInventory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageInventory: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Inventario</span>
                  <p className="text-xs text-gray-500">Crear, editar y eliminar vehículos</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageLeads}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageLeads: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Leads</span>
                  <p className="text-xs text-gray-500">Ver, editar y asignar leads</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageIntegrations}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageIntegrations: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Integraciones</span>
                  <p className="text-xs text-gray-500">Conectar y configurar redes sociales</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageTemplates}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageTemplates: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Templates</span>
                  <p className="text-xs text-gray-500">Crear y editar templates de email y mensajes</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canViewReports}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canViewReports: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Ver Reportes</span>
                  <p className="text-xs text-gray-500">Acceder a reportes y estadísticas</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageAppointments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageAppointments: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Citas</span>
                  <p className="text-xs text-gray-500">Crear, editar y cancelar citas</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageCampaigns}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageCampaigns: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Campañas</span>
                  <p className="text-xs text-gray-500">Crear y gestionar campañas de marketing</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.permissions.canManageMessages}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageMessages: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium">Gestionar Mensajes</span>
                  <p className="text-xs text-gray-500">Enviar y responder mensajes a clientes</p>
                </div>
              </label>
            </div>
            
            {/* Validación: al menos un permiso debe estar seleccionado */}
            {Object.values(formData.permissions).every(p => !p) && (
              <p className="text-xs text-red-500 mt-2">
                ⚠️ Debes seleccionar al menos un permiso
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



