'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeInventory, type RealtimeInventoryVehicle } from '@/hooks/useRealtimeInventory';
import ScheduleFromInventoryModal, {
  type ScheduleFromInventoryMode,
} from '@/components/ScheduleFromInventoryModal';
import VehicleInventoryCard from '@/components/VehicleInventoryCard';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';
import {
  PublishVehicleToSocialModal,
  type PublishSocialVehicle,
} from '@autodealers/shared/client';

type SessionUser = { tenantId?: string } | null;
type InventoryFilter = 'all' | 'available' | 'sold' | 'hidden';

export default function VehiclesList() {
  const [user, setUser] = useState<SessionUser>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);

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
    limit: 200,
  });

  const [schedule, setSchedule] = useState<{
    vehicle: RealtimeInventoryVehicle;
    mode: ScheduleFromInventoryMode;
  } | null>(null);
  const [socialPublishVehicle, setSocialPublishVehicle] = useState<PublishSocialVehicle | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const visibleVehicles = useMemo(() => {
    void refreshKey;
    return vehicles.filter((v) => {
      const extended = v as RealtimeInventoryVehicle & { deleted?: boolean };
      if (extended.deleted === true) return false;
      if (filter === 'all') return true;
      if (filter === 'available') return v.status === 'available';
      if (filter === 'sold') return v.status === 'sold';
      if (filter === 'hidden') return v.status === 'hidden';
      return true;
    });
  }, [vehicles, filter, refreshKey]);

  if (userLoading || loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!activeTenantId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-medium">No hay concesionario asignado a tu usuario.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="font-medium">No se pudo cargar el inventario</p>
        <p className="mt-2 text-sm font-mono">{error}</p>
      </div>
    );
  }

  const tabs: { id: InventoryFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'available', label: 'Activos' },
    { id: 'sold', label: 'Vendidos' },
    { id: 'hidden', label: 'Ocultos' },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              filter === tab.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleVehicles.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No hay vehículos en esta vista
          </div>
        ) : (
          visibleVehicles.map((vehicle) => (
            <VehicleInventoryCard
              key={vehicle.id}
              vehicle={vehicle}
              onRefresh={refresh}
              onSchedule={(v, mode) => setSchedule({ vehicle: v, mode })}
              onPublishSocial={(v) => setSocialPublishVehicle(v as PublishSocialVehicle)}
            />
          ))
        )}
      </div>

      {schedule ? (
        <ScheduleFromInventoryModal
          key={`${schedule.vehicle.id}-${schedule.mode}`}
          vehicle={schedule.vehicle}
          mode={schedule.mode}
          onClose={() => setSchedule(null)}
        />
      ) : null}

      {socialPublishVehicle ? (
        <PublishVehicleToSocialModal
          vehicle={socialPublishVehicle}
          onClose={() => setSocialPublishVehicle(null)}
          mode="tenant"
        />
      ) : null}
    </>
  );
}
