'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CorporateEmail {
  id: string;
  userId: string;
  tenantId: string;
  emailAddress: string;
  username: string;
  status: 'active' | 'suspended' | 'pending' | 'deleted';
  isAlias: boolean;
  parentEmailId?: string;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function CorporateEmailsPage() {
  const [emails, setEmails] = useState<CorporateEmail[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmails();
    fetchUsers();
    fetchTenants();
  }, []);

  async function fetchEmails() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/corporate-emails');
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Error fetching corporate emails:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        const usersMap: Record<string, User> = {};
        (data.users || []).forEach((user: User) => {
          usersMap[user.id] = user;
        });
        setUsers(usersMap);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function fetchTenants() {
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        const tenantsMap: Record<string, Tenant> = {};
        (data.tenants || []).forEach((tenant: Tenant) => {
          tenantsMap[tenant.id] = tenant;
        });
        setTenants(tenantsMap);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  }

  async function handleSuspend(emailId: string) {
    if (!confirm('¿Estás seguro de suspender este email?')) return;

    try {
      const response = await fetch(`/api/admin/corporate-emails/${emailId}/suspend`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('✅ Email suspendido exitosamente');
        fetchEmails();
      } else {
        alert('❌ Error al suspender email');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al suspender email');
    }
  }

  async function handleActivate(emailId: string) {
    try {
      const response = await fetch(`/api/admin/corporate-emails/${emailId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('✅ Email activado exitosamente');
        fetchEmails();
      } else {
        alert('❌ Error al activar email');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al activar email');
    }
  }

  async function handleDelete(emailId: string) {
    if (!confirm('¿Estás seguro de eliminar este email? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/admin/corporate-emails/${emailId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Email eliminado exitosamente');
        fetchEmails();
      } else {
        alert('❌ Error al eliminar email');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al eliminar email');
    }
  }

  const filteredEmails = emails.filter((email) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && email.status === 'active') ||
      (filter === 'suspended' && email.status === 'suspended') ||
      (filter === 'pending' && email.status === 'pending');

    const matchesSearch =
      !searchTerm ||
      email.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      users[email.userId]?.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Emails Corporativos</h1>
        <p className="text-gray-600">
          Gestiona todos los emails corporativos de la plataforma
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por email, usuario o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilter('suspended')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'suspended'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Suspendidos
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
          </div>
        </div>
      </div>

      {/* Lista de emails */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron emails corporativos
                  </td>
                </tr>
              ) : (
                filteredEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{email.emailAddress}</div>
                      {email.isAlias && (
                        <div className="text-xs text-gray-500">Alias</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {users[email.userId]?.name || 'Usuario no encontrado'}
                      </div>
                      <div className="text-xs text-gray-500">{users[email.userId]?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tenants[email.tenantId]?.name || 'Tenant no encontrado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          email.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : email.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : email.status === 'pending'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {email.status === 'active'
                          ? 'Activo'
                          : email.status === 'suspended'
                          ? 'Suspendido'
                          : email.status === 'pending'
                          ? 'Pendiente'
                          : 'Eliminado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {email.isAlias ? 'Alias' : 'Principal'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(email.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {email.status === 'active' ? (
                          <button
                            onClick={() => handleSuspend(email.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Suspender
                          </button>
                        ) : email.status === 'suspended' ? (
                          <button
                            onClick={() => handleActivate(email.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Activar
                          </button>
                        ) : null}
                        {email.status !== 'deleted' && (
                          <button
                            onClick={() => handleDelete(email.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-gray-900">{emails.length}</div>
          <div className="text-sm text-gray-600">Total Emails</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {emails.filter((e) => e.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-yellow-600">
            {emails.filter((e) => e.status === 'suspended').length}
          </div>
          <div className="text-sm text-gray-600">Suspendidos</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">
            {emails.filter((e) => e.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </div>
      </div>
    </div>
  );
}



