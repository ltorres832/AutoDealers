'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeInventory, type RealtimeInventoryVehicle } from '@/hooks/useRealtimeInventory';
import ScheduleFromInventoryModal, {
  type ScheduleFromInventoryMode,
} from '@/components/ScheduleFromInventoryModal';
import VehicleInventoryCard from '@/components/VehicleInventoryCard';
import BulkActionsBar from '@/components/BulkActionsBar';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';
import {
  PublishVehicleToSocialModal,
  type PublishSocialVehicle,
} from '@autodealers/shared/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import UpgradeModal from '@/components/UpgradeModal';
import ShareVehicleModal from '@/components/ShareVehicleModal';
import VinDecodeField from '@/components/VinDecodeField';

type SessionUser = { tenantId?: string } | null;
type InventoryFilter = 'all' | 'available' | 'sold' | 'hidden';

export default function VehiclesList() {
  const [user, setUser] = useState<SessionUser>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  const [editingVehicle, setEditingVehicle] = useState<RealtimeInventoryVehicle | null>(null);
  const [shareVehicle, setShareVehicle] = useState<RealtimeInventoryVehicle | null>(null);

  const openDacoLabel = useCallback(async (vehicle: RealtimeInventoryVehicle) => {
    try {
      const res = await fetchWithAuth(`/api/vehicles/${vehicle.id}/compete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daco_label' }),
      });
      const html = await res.text();
      if (!res.ok) throw new Error('No se pudo generar la etiqueta');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch {
      alert('No se pudo abrir la etiqueta DACO');
    }
  }, []);

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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
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

        <span className="flex-1" />

        <button
          type="button"
          onClick={() => {
            setSelectMode((m) => !m);
            setSelectedIds(new Set());
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${
            selectMode
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {selectMode ? 'Salir de selección' : '☑️ Selección múltiple'}
        </button>
        {selectMode && (
          <button
            type="button"
            onClick={() => setSelectedIds(new Set(visibleVehicles.map((v) => v.id)))}
            className="px-4 py-2 rounded-lg text-sm font-medium border bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          >
            Seleccionar todos
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleVehicles.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No hay vehículos en esta vista
          </div>
        ) : (
          visibleVehicles.map((vehicle) => (
            <div key={vehicle.id} className="relative">
              {selectMode && (
                <label
                  className="absolute top-3 left-3 z-20 bg-white rounded-md shadow-md p-1.5 cursor-pointer flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary-600 cursor-pointer"
                    checked={selectedIds.has(vehicle.id)}
                    onChange={() => toggleSelected(vehicle.id)}
                  />
                </label>
              )}
              <div
                className={selectMode && selectedIds.has(vehicle.id) ? 'ring-2 ring-primary-500 rounded-xl' : ''}
                onClickCapture={
                  selectMode
                    ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelected(vehicle.id);
                      }
                    : undefined
                }
              >
                <VehicleInventoryCard
                  vehicle={vehicle}
                  onRefresh={refresh}
                  onSchedule={(v, mode) => setSchedule({ vehicle: v, mode })}
                  onEdit={(v) => setEditingVehicle(v)}
                  onPublishSocial={(v) => setSocialPublishVehicle(v as PublishSocialVehicle)}
                  onShare={(v) => setShareVehicle(v)}
                  onDacoLabel={(v) => void openDacoLabel(v)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {selectMode && (
        <BulkActionsBar
          selectedIds={[...selectedIds]}
          onDone={() => {
            setSelectedIds(new Set());
            refresh();
          }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

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

      {editingVehicle ? (
        <EditVehicleMediaModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSaved={() => {
            setEditingVehicle(null);
            refresh();
          }}
        />
      ) : null}

      {shareVehicle ? (
        <ShareVehicleModal
          vehicleId={shareVehicle.id}
          label={`${shareVehicle.year} ${shareVehicle.make} ${shareVehicle.model}`}
          onClose={() => setShareVehicle(null)}
        />
      ) : null}
    </>
  );
}

function EditVehicleMediaModal({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: RealtimeInventoryVehicle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const videoUploadsEnabled = useFeatureFlag('video_uploads');
  const vinCameraEnabled = useFeatureFlag('vin_camera_scan');
  const [showVideoUpgrade, setShowVideoUpgrade] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(vehicle.photos || []);
  const [existingVideos, setExistingVideos] = useState<string[]>(vehicle.videos || []);
  const [vin, setVin] = useState(
    String((vehicle as { vin?: string }).vin || vehicle.specifications?.vin || '')
  );
  const [loading, setLoading] = useState(false);

  async function uploadFile(file: File): Promise<string | null> {
    const body = new FormData();
    body.append('file', file);
    body.append('type', 'vehicle');
    body.append('vehicleId', vehicle.id);
    const res = await fetchWithAuth('/api/upload', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && data.upgradeRequired) {
      setShowVideoUpgrade(true);
      return null;
    }
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Error al subir archivo');
    }
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vinCheck = (vin || '').trim();
    if (!vinCheck || vinCheck.length !== 17) {
      alert('El VIN es obligatorio');
      return;
    }
    setLoading(true);
    try {
      const photoUrls = [...existingPhotos];
      const videoUrls = [...existingVideos];
      for (const photo of photos) {
        const url = await uploadFile(photo);
        if (url) photoUrls.push(url);
      }
      for (const video of videos) {
        const url = await uploadFile(video);
        if (url) videoUrls.push(url);
      }
      const res = await fetchWithAuth(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photoUrls,
          videos: videoUrls,
          vin: vinCheck.toUpperCase(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo guardar el vehículo');
      }
      onSaved();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Editar vehículo</h2>
        <p className="mb-4 text-sm text-gray-600">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <VinDecodeField
            enabled={vinCameraEnabled}
            required
            value={vin}
            onChange={setVin}
            onDecoded={() => undefined}
          />
          <div>
            <label className="mb-2 block text-sm font-medium">Fotos existentes</label>
            {existingPhotos.length > 0 ? (
              <div className="mb-2 grid grid-cols-4 gap-2">
                {existingPhotos.map((url, index) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="h-16 w-full rounded object-cover" />
                    <button
                      type="button"
                      onClick={() => setExistingPhotos((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-0 top-0 rounded bg-black/60 px-1 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-2 text-sm text-gray-500">No hay fotos</p>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && setPhotos(Array.from(e.target.files))}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Videos existentes</label>
            {existingVideos.length > 0 ? (
              <div className="mb-2 space-y-1">
                {existingVideos.map((url, index) => (
                  <div key={url} className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                    <span>Video {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setExistingVideos((prev) => prev.filter((_, i) => i !== index))}
                      className="text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-2 text-sm text-gray-500">No hay videos</p>
            )}
            <input
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => {
                if (!videoUploadsEnabled) {
                  setShowVideoUpgrade(true);
                  e.target.value = '';
                  return;
                }
                if (e.target.files) setVideos(Array.from(e.target.files));
              }}
              className="w-full rounded border px-3 py-2"
            />
            {videos.length > 0 ? (
              <p className="mt-1 text-sm text-gray-500">{videos.length} video(s) nuevo(s)</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
      <UpgradeModal
        isOpen={showVideoUpgrade}
        onClose={() => setShowVideoUpgrade(false)}
        reason="La subida de videos no está incluida en tu plan. Selecciona o activa una membresía que incluya videos de vehículos."
        featureName="Videos de vehículos"
      />
    </div>
  );
}
