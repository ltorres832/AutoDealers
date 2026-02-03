'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TenantDetails {
  id: string;
  name: string;
  type: string;
  subdomain?: string;
  status: string;
  branding: any;
  settings: any;
  membershipId?: string;
  users: any[];
  vehicles: any[];
  leads: any[];
  sales: any[];
}

export default function TenantDetailPage() {
  const params = useParams();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'inventory' | 'leads' | 'sales' | 'settings'>('overview');
  const [showGrantFreeMonthModal, setShowGrantFreeMonthModal] = useState<{ userId: string; userName: string } | null>(null);

  useEffect(() => {
    fetchTenantDetails();
  }, [params.id]);

  async function fetchTenantDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${params.id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching tenant:', response.status, errorData);
        setTenant(null);
        return;
      }
      
      const data = await response.json();
      if (data.tenant) {
        setTenant(data.tenant);
      } else {
        console.error('Tenant data not found in response:', data);
        setTenant(null);
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      setTenant(null);
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

  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/admin/tenants" className="text-primary-600 hover:underline mb-4">
          ← Volver a Tenants
        </Link>
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Tenant no encontrado</h1>
          <p className="text-gray-600 mb-2">
            El tenant con ID <code className="bg-gray-100 px-2 py-1 rounded">{params.id}</code> no existe o no se pudo cargar.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Posibles causas:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
            <li>El tenant fue eliminado</li>
            <li>El ID del tenant es incorrecto</li>
            <li>Problemas de conexión con la base de datos</li>
            <li>Problemas de autenticación</li>
          </ul>
          <button
            onClick={fetchTenantDetails}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/tenants" className="text-primary-600 hover:underline mb-4">
        ← Volver a Tenants
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-gray-600 capitalize">{tenant.type}</p>
            {tenant.subdomain && (
              <p className="text-sm text-gray-500 mt-1">
                {tenant.subdomain}.autodealers.com
              </p>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              tenant.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {tenant.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          {(['overview', 'users', 'inventory', 'leads', 'sales', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' ? 'Resumen' : tab === 'users' ? 'Usuarios' : tab === 'inventory' ? 'Inventario' : tab === 'leads' ? 'Leads' : tab === 'sales' ? 'Ventas' : 'Configuración'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Usuarios</p>
            <p className="text-3xl font-bold">{tenant.users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Vehículos</p>
            <p className="text-3xl font-bold">{tenant.vehicles.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Leads</p>
            <p className="text-3xl font-bold">{tenant.leads.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Ventas</p>
            <p className="text-3xl font-bold">{tenant.sales.length}</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenant.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">{user.name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4 capitalize">{user.role}</td>
                  <td className="px-6 py-4">
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
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
              {tenant.vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-6 py-4">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </td>
                  <td className="px-6 py-4">
                    ${vehicle.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 capitalize">{vehicle.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fuente
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
              {tenant.leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{lead.contact.name}</div>
                      <div className="text-sm text-gray-500">{lead.contact.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">{lead.source}</td>
                  <td className="px-6 py-4 capitalize">{lead.status}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenant.sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4">
                    {sale.vehicleYear} {sale.vehicleMake} {sale.vehicleModel}
                  </td>
                  <td className="px-6 py-4">{sale.customerName}</td>
                  <td className="px-6 py-4">
                    ${sale.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Configuración del Tenant</h2>
            <Link
              href={`/admin/tenants/${tenant.id}/edit`}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
            >
              Editar Configuración
            </Link>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Nombre:</span>
              <p className="font-medium">{tenant.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Subdominio:</span>
              <p className="font-medium">{tenant.subdomain || 'No configurado'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Estado:</span>
              <p className="font-medium capitalize">{tenant.status}</p>
            </div>
          </div>
        </div>
      )}

      {showGrantFreeMonthModal && (
        <GrantFreeMonthModal
          userId={showGrantFreeMonthModal.userId}
          userName={showGrantFreeMonthModal.userName}
          onClose={() => setShowGrantFreeMonthModal(null)}
          onSuccess={fetchTenantDetails}
        />
      )}
    </div>
  );
}

function GrantFreeMonthModal({
  userId,
  userName,
  onClose,
  onSuccess,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('authToken') || 
          document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1]
        : null;

      const response = await fetch(`/api/admin/users/${userId}/grant-free-month`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ months }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al otorgar mes gratis');
      }
    } catch (err: any) {
      setError(err.message || 'Error al otorgar mes gratis');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Otorgar Mes Gratis</h2>
          <p className="text-sm text-gray-600 mt-1">Usuario: {userName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              Cantidad de Meses Gratis
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
              className="w-full border rounded px-3 py-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Los meses gratis se aplicarán automáticamente en el próximo ciclo de facturación
            </p>
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
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Otorgando...' : `Otorgar ${months} Mes${months > 1 ? 'es' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

