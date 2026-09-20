'use client';

import Link from 'next/link';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  shouldShowSoldOverlay,
  vehicleStatusLabel,
  canReactivateVehicleStatus,
  isVehicleAvailableStatus,
  type VehicleListingAction,
} from '@autodealers/inventory/client';
import VehicleListingDispositionModal from '@/components/VehicleListingDispositionModal';
import FeaturedPurchaseModal from '@/components/FeaturedPurchaseModal';
import type { ScheduleFromInventoryMode } from '@/components/ScheduleFromInventoryModal';

export interface InventoryCardVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  status: string;
  photos: string[];
  videos?: string[];
  generatedVideoUrl?: string;
  publishedOnPublicPage?: boolean;
  showSoldBadge?: boolean;
  showPublicSoldBadge?: boolean;
  deleted?: boolean;
  views?: number;
  lastViewedAt?: Date;
  stockNumber?: string;
  specifications?: { stockNumber?: string };
}

function stockLabel(v: InventoryCardVehicle): string | null {
  return v.stockNumber || v.specifications?.stockNumber || null;
}

type DispositionMode = 'dispose' | 'sold_options' | null;

export interface VehicleInventoryCardProps {
  vehicle: InventoryCardVehicle;
  onRefresh: () => void;
  onSchedule?: (vehicle: InventoryCardVehicle, mode: ScheduleFromInventoryMode) => void;
  showSchedule?: boolean;
  showPublish?: boolean;
  onEdit?: (vehicle: InventoryCardVehicle) => void;
  onFullSale?: (vehicle: InventoryCardVehicle) => void;
  onPublishSocial?: (vehicle: InventoryCardVehicle) => void;
  onShare?: (vehicle: InventoryCardVehicle) => void;
  onDacoLabel?: (vehicle: InventoryCardVehicle) => void;
  showPhotoGuide?: boolean;
}

export default function VehicleInventoryCard({
  vehicle,
  onRefresh,
  onSchedule,
  showSchedule = true,
  showPublish = true,
  onEdit,
  onFullSale,
  onPublishSocial,
  onShare,
  onDacoLabel,
  showPhotoGuide = true,
}: VehicleInventoryCardProps) {
  const [busy, setBusy] = useState(false);
  const [disposition, setDisposition] = useState<DispositionMode>(null);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const isAvailable = isVehicleAvailableStatus(vehicle.status);
  const canReactivate = canReactivateVehicleStatus(vehicle.status);
  const showSold = shouldShowSoldOverlay(vehicle);

  const patchListing = useCallback(
    async (action: VehicleListingAction | 'keep_active', showPublicSoldBadge?: boolean) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/vehicles/${vehicle.id}/listing`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, showPublicSoldBadge }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
            details?: string;
          };
          alert(err.details || err.error || 'No se pudo actualizar el vehículo');
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
      const res = await fetch(`/api/vehicles/${vehicle.id}/publish`, {
        method: 'PATCH',
        credentials: 'include',
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

  async function handleGenerateVideo() {
    if (
      !confirm(
        `Se creará un video promocional con las fotos de ${label}. Puede tardar hasta un minuto. ¿Continuar?`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/generate-video`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        videoUrl?: string;
        photosUsed?: number;
      };
      if (!res.ok) {
        alert(data.error || 'No se pudo generar el video');
        return;
      }
      alert(
        `✅ Video generado con ${data.photosUsed ?? 0} fotos. Ya aparece en la página pública del vehículo y disponible para redes.`
      );
      onRefresh();
    } catch {
      alert('Error de conexión al generar el video');
    } finally {
      setBusy(false);
    }
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
      className={`bg-white rounded-lg shadow hover:shadow-lg transition ${
        busy ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {vehicle.photos?.[0] ? (
          <img
            src={vehicle.photos[0]}
            alt={label}
            className={`w-full h-full object-cover ${showSold ? 'opacity-70' : ''}`}
          />
        ) : vehicle.videos?.[0] ? (
          <video
            src={vehicle.videos[0]}
            muted
            playsInline
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
            <span className="text-xs font-semibold bg-primary-100 text-primary-800 px-2 py-1 rounded whitespace-nowrap">
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
        {typeof (vehicle as { quantity?: number }).quantity === 'number' ? (
          <span className="inline-block mt-2 ml-2 px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 font-medium">
            {(vehicle as { quantity?: number }).quantity} unidad{(vehicle as { quantity?: number }).quantity === 1 ? '' : 'es'}
          </span>
        ) : null}

        <p className="mt-2 text-xs text-gray-500">
          👁️ {(vehicle.views ?? 0).toLocaleString()} vista{(vehicle.views ?? 0) === 1 ? '' : 's'} en la web
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {onShare ? (
            <button
              type="button"
              onClick={() => onShare(vehicle)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 text-sm font-medium hover:bg-sky-100"
            >
              🔗 Compartir / QR
            </button>
          ) : null}
          {onDacoLabel ? (
            <button
              type="button"
              onClick={() => onDacoLabel(vehicle)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-900 text-sm font-medium hover:bg-orange-100"
            >
              🏷️ Etiqueta DACO
            </button>
          ) : null}
          {showPhotoGuide ? (
            <Link
              href={`/inventory/photos/${vehicle.id}`}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-900 text-sm font-medium hover:bg-violet-100 text-center"
            >
              📷 Guía de fotos
            </Link>
          ) : null}
        </div>

        <div className="mt-4 relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="w-full flex items-center justify-between gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 font-medium text-sm transition-colors"
          >
            <span>Acciones</span>
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            >
              {onEdit ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    onEdit(vehicle);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span aria-hidden>✏️</span> Editar
                </button>
              ) : null}

              {onShare ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    onShare(vehicle);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-sky-50"
                >
                  <span aria-hidden>🔗</span> Compartir / QR
                </button>
              ) : null}

              {onDacoLabel ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    onDacoLabel(vehicle);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-orange-50"
                >
                  <span aria-hidden>🏷️</span> Etiqueta DACO
                </button>
              ) : null}

              {showPhotoGuide ? (
                <Link
                  href={`/inventory/photos/${vehicle.id}`}
                  role="menuitem"
                  onClick={closeMenu}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50"
                >
                  <span aria-hidden>📷</span> Guía de fotos
                </Link>
              ) : null}

              {isAvailable && showSchedule && onSchedule ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenu();
                      onSchedule(vehicle, 'appointment');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50"
                  >
                    <span aria-hidden>📅</span> Crear cita
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenu();
                      onSchedule(vehicle, 'test_drive_request');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-primary-50"
                  >
                    <span aria-hidden>🚗</span> Prueba de manejo
                  </button>
                </>
              ) : null}

              {isAvailable && showPublish ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    void togglePublish();
                  }}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-green-50 ${
                    vehicle.publishedOnPublicPage ? 'text-green-700' : 'text-slate-700'
                  }`}
                >
                  <span aria-hidden>🌐</span>{' '}
                  {vehicle.publishedOnPublicPage ? 'Publicado en web' : 'Publicar en web'}
                </button>
              ) : null}

              {isAvailable && onPublishSocial && ((vehicle.photos?.length ?? 0) > 0 || (vehicle.videos?.length ?? 0) > 0 || Boolean(vehicle.generatedVideoUrl)) ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    onPublishSocial(vehicle);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-primary-50"
                >
                  <span aria-hidden>📱</span> Publicar en redes
                </button>
              ) : null}

              {isAvailable && (vehicle.photos?.length ?? 0) >= 2 ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    void handleGenerateVideo();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-purple-50"
                >
                  <span aria-hidden>🎬</span> Generar video con fotos
                </button>
              ) : null}

              {isAvailable ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenu();
                      setDisposition('sold_options');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    <span aria-hidden>🏷️</span> Marcar vendido (SOLD)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenu();
                      void patchListing('hide');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span aria-hidden>👁️‍🗨️</span> Ocultar de la web
                  </button>
                  {onFullSale ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenu();
                        onFullSale(vehicle);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-primary-50"
                    >
                      <span aria-hidden>📋</span> Venta completa (contrato / F&I)
                    </button>
                  ) : null}
                </>
              ) : null}

              {canReactivate ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    void patchListing('reactivate');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-green-700 hover:bg-green-50"
                >
                  <span aria-hidden>↩️</span> Volver a disponible
                </button>
              ) : null}

              <Link
                href={`/catalog-interest?vehicleId=${encodeURIComponent(vehicle.id)}`}
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <span aria-hidden>👁️</span> Interés en la web
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  setShowFeaturedModal(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-amber-800 hover:bg-amber-50"
              >
                <span aria-hidden>⭐</span> Destacar / Boost
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  void handleDelete();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50"
              >
                <span aria-hidden>🗑️</span> Eliminar del inventario
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>

    {disposition ? (
      <VehicleListingDispositionModal
        vehicleLabel={label}
        mode={disposition}
        saleDocumentsPayload={{
          vehicleId: vehicle.id,
          vehicle: {
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            vin: (vehicle as { vin?: string }).vin,
            stockNumber: (vehicle as { stockNumber?: string }).stockNumber,
          },
          sale: { price: vehicle.price },
        }}
        onClose={() => setDisposition(null)}
        onConfirm={(action, showPublic) => void patchListing(action, showPublic)}
      />
    ) : null}
    {showFeaturedModal ? (
      <FeaturedPurchaseModal
        targetType="vehicle"
        targetId={vehicle.id}
        title={label}
        onClose={() => setShowFeaturedModal(false)}
        onSuccess={onRefresh}
      />
    ) : null}
  </>
  );
}
