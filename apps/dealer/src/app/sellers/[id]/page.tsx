'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Seller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  salesCount?: number;
  revenue?: number;
  createdAt: string;
  tenantId?: string;
  dealerId?: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  photos?: string[];
}

interface SellerDetails {
  seller: Seller;
  stats: {
    totalLeads: number;
    activeLeads: number;
    totalSales: number;
    completedSales: number;
    totalRevenue: number;
    totalAppointments: number;
    upcomingAppointments: number;
    totalVehicles: number;
    availableVehicles: number;
    soldVehicles: number;
    totalCampaigns: number;
    activeCampaigns: number;
    pastCampaigns: number;
    totalPromotions: number;
    activePromotions: number;
    pastPromotions: number;
  };
  leads: any[];
  sales: any[];
  appointments: any[];
  vehicles: Vehicle[];
}

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;
  const [sellerDetails, setSellerDetails] = useState<SellerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (sellerId) {
      fetchSellerDetails();
    }
  }, [sellerId]);

  async function fetchSellerDetails() {
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth(`/api/sellers/${sellerId}`, {});
      
      if (response.ok) {
        const data = await response.json();
        setSellerDetails(data);
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!sellerDetails) return;
    
    const newStatus = sellerDetails.seller.status === 'active' ? 'suspended' : 'active';
    const confirmMessage = newStatus === 'suspended' 
      ? '¿Estás seguro de que quieres desactivar este vendedor? No podrá acceder a su cuenta.'
      : '¿Estás seguro de que quieres activar este vendedor?';
    
    if (!confirm(confirmMessage)) return;

    setUpdating(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth(`/api/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchSellerDetails(); // Recargar datos
        alert(`Vendedor ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al actualizar vendedor');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar vendedor');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!sellerDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">Vendedor no encontrado</h2>
          <p className="text-red-700 mb-4">El vendedor que buscas no existe o no tienes acceso a él.</p>
          <Link href="/sellers" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Volver a Vendedores
          </Link>
        </div>
      </div>
    );
  }

  const { seller, stats } = sellerDetails;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/sellers" className="text-primary-600 hover:text-primary-700 font-medium mb-4 inline-block">
          ← Volver a Vendedores
        </Link>
        <h1 className="text-3xl font-bold mt-4">Detalles del Vendedor</h1>
      </div>

      {/* Información Principal */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{seller.name}</h2>
            <p className="text-gray-600">{seller.email}</p>
            {seller.phone && (
              <p className="text-gray-600 text-sm mt-1">📱 {seller.phone}</p>
            )}
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              seller.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {seller.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Leads Totales</p>
            <p className="text-2xl font-bold">{stats.totalLeads}</p>
            <p className="text-xs text-green-600 mt-1">{stats.activeLeads} activos</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Ventas Totales</p>
            <p className="text-2xl font-bold">{stats.totalSales}</p>
            <p className="text-xs text-green-600 mt-1">{stats.completedSales} completadas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Revenue Total</p>
            <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Inventario</p>
            <p className="text-2xl font-bold">{stats.totalVehicles}</p>
            <p className="text-xs text-blue-600 mt-1">{stats.availableVehicles} disponibles</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Citas</p>
            <p className="text-2xl font-bold">{stats.totalAppointments}</p>
            <p className="text-xs text-blue-600 mt-1">{stats.upcomingAppointments} próximas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">📢 Campañas</p>
            <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
            <p className="text-xs text-purple-600 mt-1">{stats.activeCampaigns} activas</p>
            <p className="text-xs text-gray-500 mt-1">{stats.pastCampaigns} pasadas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">🎁 Promociones</p>
            <p className="text-2xl font-bold">{stats.totalPromotions}</p>
            <p className="text-xs text-purple-600 mt-1">{stats.activePromotions} activas</p>
            <p className="text-xs text-gray-500 mt-1">{stats.pastPromotions} pasadas</p>
          </div>
        </div>

        {seller.tenantId && seller.tenantId !== seller.dealerId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>✅ Tiene cuenta propia:</strong> Este vendedor tiene su propia cuenta con página web personal.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Tenant ID: {seller.tenantId}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              El vendedor puede iniciar sesión en: <strong>http://localhost:3003/login</strong> (desarrollo) o en su subdominio personalizado (producción)
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Editar Vendedor
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={updating}
            className={`px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${
              seller.status === 'active'
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {updating ? 'Actualizando...' : (seller.status === 'active' ? 'Desactivar' : 'Activar')}
          </button>
        </div>
      </div>

      {/* Leads Recientes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Leads Recientes</h3>
        {sellerDetails.leads.length > 0 ? (
          <div className="space-y-2">
            {sellerDetails.leads.map((lead) => (
              <div key={lead.id} className="border-b pb-2">
                <p className="font-medium">{lead.contact?.name || 'Sin nombre'}</p>
                <p className="text-sm text-gray-600">
                  {lead.contact?.phone || lead.contact?.email || 'Sin contacto'} • {lead.status || 'nuevo'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay leads asignados a este vendedor</p>
        )}
      </div>

      {/* Ventas Recientes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Ventas Recientes</h3>
        {sellerDetails.sales.length > 0 ? (
          <div className="space-y-2">
            {sellerDetails.sales.map((sale) => (
              <div key={sale.id} className="border-b pb-2">
                <p className="font-medium">
                  ${(sale.salePrice || sale.total || 0).toLocaleString()} - {sale.vehicle?.make || ''} {sale.vehicle?.model || ''}
                </p>
                <p className="text-sm text-gray-600">
                  {sale.buyer?.fullName || 'Sin comprador'} • {sale.status || 'pendiente'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay ventas registradas</p>
        )}
      </div>

      {/* Inventario */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Inventario</h3>
          <Link
            href={`/inventory${seller.tenantId && seller.tenantId !== seller.dealerId ? `?tenantId=${seller.tenantId}` : ''}`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver Todo →
          </Link>
        </div>
        {sellerDetails.vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sellerDetails.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                {vehicle.photos && vehicle.photos.length > 0 && (
                  <img
                    src={vehicle.photos[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <p className="font-bold text-lg">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                <p className="text-primary-600 font-semibold">${vehicle.price.toLocaleString()}</p>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                    vehicle.status === 'available'
                      ? 'bg-green-100 text-green-700'
                      : vehicle.status === 'sold'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {vehicle.status === 'available' ? 'Disponible' : vehicle.status === 'sold' ? 'Vendido' : 'Reservado'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay vehículos en el inventario</p>
        )}
      </div>

      {/* Citas Próximas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Citas Próximas</h3>
        {sellerDetails.appointments.length > 0 ? (
          <div className="space-y-2">
            {sellerDetails.appointments.map((apt) => (
              <div key={apt.id} className="border-b pb-2">
                <p className="font-medium">
                  {new Date(apt.scheduledAt).toLocaleDateString()} {new Date(apt.scheduledAt).toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-600">
                  {apt.customerName || 'Sin cliente'} • {apt.status || 'programada'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay citas programadas</p>
        )}
      </div>

      {/* Modal de Edición */}
      {showEditModal && (
        <EditSellerModal
          seller={seller}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchSellerDetails}
        />
      )}
    </div>
  );
}

function EditSellerModal({
  seller,
  onClose,
  onSuccess,
}: {
  seller: Seller;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(seller.name);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const response = await fetchWithAuth(`/api/sellers/${seller.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        alert('Vendedor actualizado correctamente');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al actualizar vendedor');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar vendedor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Editar Vendedor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={seller.email}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
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
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-300"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

