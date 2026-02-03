'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRealtimeTenants } from '@/hooks/useRealtimeTenants';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';
import StarRating from '@/components/StarRating';

interface Tenant {
  id: string;
  name: string;
  companyName?: string; // Nombre de la compañía (solo para dealers)
  type: 'dealer' | 'seller';
  subdomain?: string;
  status: 'active' | 'inactive' | 'suspended';
  membershipId?: string;
  createdAt: string;
  userCount?: number;
  vehicleCount?: number;
  leadCount?: number;
  // Calificaciones
  avgDealerRating?: number;
  dealerRatingCount?: number;
  avgSellerRating?: number;
  sellerRatingCount?: number;
}

export default function AdminTenantsPage() {
  const { tenants, loading, error } = useRealtimeTenants();
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function toggleStatus(tenantId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }
      // Los datos se actualizan automáticamente con useRealtimeTenants
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el estado del tenant');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-semibold">Error al cargar tenants</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Gestión de Tenants</h1>
            <RealtimeIndicator isActive={!loading} />
          </div>
          <p className="text-gray-600 mt-2">
            Control total sobre todos los dealers y vendedores en tiempo real
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Tenant
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No hay tenants registrados</p>
          <p className="text-gray-400 text-sm mt-2">Los tenants aparecerán aquí cuando se creen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                {tenant.type === 'dealer' && tenant.companyName && (
                  <p className="text-xs text-primary-600 font-semibold mb-1">
                    {tenant.companyName}
                  </p>
                )}
                <h3 className="text-lg font-bold">{tenant.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{tenant.type}</p>
                {tenant.subdomain && (
                  <p className="text-xs text-gray-500 mt-1">
                    {tenant.subdomain}.autodealers.com
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded text-xs font-medium ${
                  tenant.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : tenant.status === 'suspended'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {tenant.status === 'active' ? 'Activo' : tenant.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-2xl font-bold">{tenant.userCount || 0}</p>
                <p className="text-xs text-gray-500">Usuarios</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant.vehicleCount || 0}</p>
                <p className="text-xs text-gray-500">Vehículos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{tenant.leadCount || 0}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
            </div>

            {/* Calificaciones */}
            {((tenant.type === 'dealer' && tenant.avgDealerRating && tenant.avgDealerRating > 0) || 
              (tenant.type === 'seller' && tenant.avgSellerRating && tenant.avgSellerRating > 0)) && (
              <div className="mb-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Calificación Promedio:</span>
                  <StarRating
                    rating={tenant.type === 'dealer' ? (tenant.avgDealerRating || 0) : (tenant.avgSellerRating || 0)}
                    count={tenant.type === 'dealer' ? (tenant.dealerRatingCount || 0) : (tenant.sellerRatingCount || 0)}
                    size="sm"
                    showCount={true}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Link
                href={`/admin/tenants/${tenant.id}`}
                className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
              >
                Ver Detalles
              </Link>
              <button
                onClick={() => toggleStatus(tenant.id, tenant.status)}
                className={`px-4 py-2 rounded text-sm ${
                  tenant.status === 'active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {tenant.status === 'active' ? 'Suspender' : 'Activar'}
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Los datos se actualizan automáticamente con useRealtimeTenants
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTenantModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '', // Nombre de la compañía (solo para dealers)
    type: 'dealer' as 'dealer' | 'seller',
    subdomain: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear tenant');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear tenant');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Tenant</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="dealer">Dealer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          {formData.type === 'dealer' && (
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de la Compañía *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Grupo Automotriz ABC"
                required={formData.type === 'dealer'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Para identificar múltiples dealers de la misma compañía
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              {formData.type === 'dealer' ? 'Nombre del Dealer' : 'Nombre'} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder={formData.type === 'dealer' ? 'Ej: Dealer Centro' : 'Ej: Juan Pérez'}
              required
            />
            {formData.type === 'dealer' && (
              <p className="text-xs text-gray-500 mt-1">
                Nombre específico de este dealer
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subdominio</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                className="flex-1 border rounded-l px-3 py-2"
                placeholder="mi-dealer"
              />
              <span className="border border-l-0 rounded-r px-3 py-2 bg-gray-50">
                .autodealers.com
              </span>
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
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

