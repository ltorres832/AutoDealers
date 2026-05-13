'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeInventory, type RealtimeInventoryVehicle } from '@/hooks/useRealtimeInventory';
import ScheduleFromInventoryModal, {
  type ScheduleFromInventoryMode,
} from '@/components/ScheduleFromInventoryModal';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';

type SessionUser = { tenantId?: string } | null;

function stockLabel(v: RealtimeInventoryVehicle): string | null {
  return v.stockNumber || v.specifications?.stockNumber || null;
}

export default function VehiclesList() {
  const [user, setUser] = useState<SessionUser>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    void fetchWithAuth('/api/user', {})
      .then((res) => {
        if (!res.ok) throw new Error('user');
        return res.json();
      })
      .then((data) => setUser(data.user ?? null))
      .catch((err) => console.error('Error fetching user:', err))
      .finally(() => setUserLoading(false));
  }, []);

  const activeTenantId = getDealerActiveTenantId(user?.tenantId ?? null);
  const { vehicles, loading, error } = useRealtimeInventory({
    tenantId: activeTenantId,
    status: 'available',
  });
  const [schedule, setSchedule] = useState<{
    vehicle: RealtimeInventoryVehicle;
    mode: ScheduleFromInventoryMode;
  } | null>(null);

  const togglePublishVehicle = useCallback(async (vehicle: RealtimeInventoryVehicle) => {
    try {
      const response = await fetchWithAuth(`/api/vehicles/${vehicle.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishedOnPublicPage: !vehicle.publishedOnPublicPage,
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const errBody = await response.json();
        alert(errBody.error || 'Error al actualizar publicación');
      }
    } catch (e) {
      console.error('Error:', e);
      alert('Error al actualizar publicación');
    }
  }, []);

  if (userLoading || loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!activeTenantId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-medium">No hay concesionario asignado a tu usuario.</p>
        <p className="mt-2 text-sm">
          Revisa tu perfil o contacta soporte para vincular un{' '}
          <code className="rounded bg-amber-100 px-1">tenantId</code>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="font-medium">No se pudo cargar el inventario</p>
        <p className="mt-2 text-sm font-mono">{error}</p>
        <p className="mt-2 text-sm text-red-800">
          Si el error menciona un índice de Firestore, despliega los índices del repositorio o créalo en la consola de Firebase.
        </p>
      </div>
    );
  }

  return (
    <>
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
                  {stockLabel(vehicle) ? (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                      #{stockLabel(vehicle)}
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
                  <>
                    <button
                      type="button"
                      onClick={() => setSchedule({ vehicle, mode: 'appointment' })}
                      className="mt-4 w-full px-4 py-2 rounded font-medium bg-amber-600 text-white hover:bg-amber-700"
                    >
                      📅 Crear cita (cliente)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedule({ vehicle, mode: 'test_drive_request' })}
                      className="mt-2 w-full px-4 py-2 rounded font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      🚗 Solicitar prueba de manejo
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePublishVehicle(vehicle)}
                      className={`mt-2 w-full px-4 py-2 rounded font-medium ${
                        vehicle.publishedOnPublicPage
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {vehicle.publishedOnPublicPage
                        ? '🌐 Publicado en Página Pública'
                        : '🌐 Publicar en Página Pública'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {schedule && (
        <ScheduleFromInventoryModal
          key={`${schedule.vehicle.id}-${schedule.mode}`}
          vehicle={schedule.vehicle}
          mode={schedule.mode}
          onClose={() => setSchedule(null)}
        />
      )}
    </>
  );
}
