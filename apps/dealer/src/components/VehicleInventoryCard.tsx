'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import {
  shouldShowSoldOverlay,
  vehicleStatusLabel,
  canReactivateVehicleStatus,
  isVehicleAvailableStatus,
  type VehicleListingAction,
} from '@autodealers/inventory/client';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import VehicleListingDispositionModal from '@/components/VehicleListingDispositionModal';
import type { RealtimeInventoryVehicle } from '@/hooks/useRealtimeInventory';
import type { ScheduleFromInventoryMode } from '@/components/ScheduleFromInventoryModal';

function stockLabel(v: RealtimeInventoryVehicle): string | null {
  return v.stockNumber || v.specifications?.stockNumber || null;
}

type DispositionMode = 'dispose' | 'sold_options' | null;

export interface VehicleInventoryCardProps {
  vehicle: RealtimeInventoryVehicle & {
    showSoldBadge?: boolean;
    showPublicSoldBadge?: boolean;
    deleted?: boolean;
  };
  onRefresh: () => void;
  onSchedule?: (vehicle: RealtimeInventoryVehicle, mode: ScheduleFromInventoryMode) => void;
  showSchedule?: boolean;
  showPublish?: boolean;
  onEdit?: (vehicle: RealtimeInventoryVehicle) => void;
  onPublishSocial?: (vehicle: RealtimeInventoryVehicle) => void;
}

export default function VehicleInventoryCard({
  vehicle,
  onRefresh,
  onSchedule,
  showSchedule = true,
  showPublish = true,
  onEdit,
  onPublishSocial,
}: VehicleInventoryCardProps) {
  const [busy, setBusy] = useState(false);
  const [disposition, setDisposition] = useState<DispositionMode>(null);

  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const isAvailable = isVehicleAvailableStatus(vehicle.status);
  const canReactivate = canReactivateVehicleStatus(vehicle.status);
  const showSold = shouldShowSoldOverlay(vehicle);

  const patchListing = useCallback(
    async (action: VehicleListingAction | 'keep_active', showPublicSoldBadge?: boolean) => {
      setBusy(true);
      try {
        const res = await fetchWithAuth(`/api/vehicles/${vehicle.id}/listing`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, showPublicSoldBadge }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert((err as { error?: string }).error || 'No se pudo actualizar el vehículo');
          return;
        }
        setDisposition(null);
        onRefresh();
      } catch {
        alert('Error de conexión');
      } finally {
        setBusy(false);
      }
    },
    [vehicle.id, onRefresh]
  );

  async function togglePublish() {
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/vehicles/${vehicle.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedOnPublicPage: !vehicle.publishedOnPublicPage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error || 'Error al publicar');
        return;
      }
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `¿Eliminar ${label} del inventario? El registro se conserva pero ya no aparecerá en la lista.`
      )
    ) {
      return;
    }
    await patchListing('delete');
  }

  const statusClass =
    vehicle.status === 'available'
      ? 'bg-green-100 text-green-800'
      : vehicle.status === 'sold'
        ? 'bg-red-100 text-red-800'
        : vehicle.status === 'hidden'
          ? 'bg-slate-200 text-slate-800'
          : 'bg-gray-100 text-gray-800';

  return (
  <>
    <div
      className={`bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition ${
        busy ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <div className="relative h-48 bg-gray-200">
        {vehicle.photos?.[0] ? (
          <img
            src={vehicle.photos[0]}
            alt={label}
            className={`w-full h-full object-cover ${showSold ? 'opacity-70' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Sin foto
          </div>
        )}
        {showSold ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl font-black tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-4 border-white/90 px-6 py-2 rotate-[-8deg]">
              SOLD
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg">{label}</h3>
          {stockLabel(vehicle) ? (
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
              #{stockLabel(vehicle)}
            </span>
          ) : null}
        </div>
        <p className="text-2xl font-bold text-primary-600">
          {vehicle.currency} {vehicle.price.toLocaleString()}
        </p>
        <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${statusClass}`}>
          {vehicleStatusLabel(vehicle.status)}
        </span>

        <div className="mt-4 space-y-2">
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(vehicle)}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-medium text-sm"
            >
              ✏️ Editar
            </button>
          ) : null}

          {isAvailable && showSchedule && onSchedule ? (
            <>
              <button
                type="button"
                onClick={() => onSchedule(vehicle, 'appointment')}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 font-medium text-sm"
              >
                📅 Crear cita
              </button>
              <button
                type="button"
                onClick={() => onSchedule(vehicle, 'test_drive_request')}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium text-sm"
              >
                🚗 Prueba de manejo
              </button>
            </>
          ) : null}

          {isAvailable && showPublish ? (
            <button
              type="button"
              onClick={() => void togglePublish()}
              className={`w-full px-4 py-2 rounded font-medium text-sm ${
                vehicle.publishedOnPublicPage
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {vehicle.publishedOnPublicPage ? '🌐 Publicado en web' : '🌐 Publicar en web'}
            </button>
          ) : null}

          {isAvailable && onPublishSocial && (vehicle.photos?.length ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => onPublishSocial(vehicle)}
              className="w-full px-4 py-2 rounded font-medium text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            >
              📱 Publicar en redes
            </button>
          ) : null}

          {isAvailable ? (
            <>
              <button
                type="button"
                onClick={() => setDisposition('sold_options')}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium text-sm"
              >
                🏷️ Marcar vendido (SOLD)
              </button>
              <button
                type="button"
                onClick={() => void patchListing('hide')}
                className="w-full bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700 font-medium text-sm"
              >
                👁️‍🗨️ Ocultar de la web
              </button>
            </>
          ) : null}

          {canReactivate ? (
            <button
              type="button"
              onClick={() => void patchListing('reactivate')}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium text-sm"
            >
              ↩️ Volver a disponible
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void handleDelete()}
            className="w-full border border-red-200 text-red-700 px-4 py-2 rounded hover:bg-red-50 font-medium text-sm"
          >
            🗑️ Eliminar del inventario
          </button>

          <Link
            href={`/catalog-interest?vehicleId=${encodeURIComponent(vehicle.id)}`}
            className="block w-full text-center px-4 py-2 rounded font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 text-sm"
          >
            👁️ Interés en la web
          </Link>
        </div>
      </div>
    </div>

    {disposition ? (
      <VehicleListingDispositionModal
        vehicleLabel={label}
        mode={disposition}
        onClose={() => setDisposition(null)}
        onConfirm={(action, showPublic) => void patchListing(action, showPublic)}
      />
    ) : null}
  </>
  );
}
