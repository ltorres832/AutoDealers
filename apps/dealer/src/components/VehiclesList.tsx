'use client';

import { useState, useEffect } from 'react';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';

export default function VehiclesList() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error('Error fetching user:', err));
  }, []);

  const { vehicles, loading } = useRealtimeInventory({
    tenantId: user?.tenantId,
    status: 'available',
  });

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.length === 0 ? (
        <div className="col-span-full text-center text-gray-500 py-8">
          No hay vehículos disponibles
        </div>
      ) : (
        vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
          >
            {vehicle.photos && vehicle.photos.length > 0 && (
              <div className="relative h-48 bg-gray-200">
                <img
                  src={vehicle.photos[0]}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                {(vehicle as any).stockNumber || (vehicle as any).specifications?.stockNumber ? (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                    #{(vehicle as any).stockNumber || (vehicle as any).specifications?.stockNumber}
                  </span>
                ) : null}
              </div>
              <p className="text-2xl font-bold text-primary-600 mt-2">
                {vehicle.currency} {vehicle.price.toLocaleString()}
              </p>
              <span
                className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                  vehicle.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {vehicle.status}
              </span>
              
              {vehicle.status === 'available' && (
                <button
                  onClick={() => togglePublishVehicle(vehicle)}
                  className={`mt-4 w-full px-4 py-2 rounded font-medium ${
                    (vehicle as any).publishedOnPublicPage
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {(vehicle as any).publishedOnPublicPage ? '🌐 Publicado en Página Pública' : '🌐 Publicar en Página Pública'}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  async function togglePublishVehicle(vehicle: any) {
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishedOnPublicPage: !(vehicle as any).publishedOnPublicPage,
        }),
      });

      if (response.ok) {
        // Los vehículos se actualizarán automáticamente con useRealtimeInventory
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar publicación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar publicación');
    }
  }
}





