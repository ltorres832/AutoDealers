'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import VehicleImageFrame from '@/components/VehicleImageFrame';
import {
  buildPublicVehicleDetailHref,
  isTenantSubdomainHost,
} from '@/lib/public-vehicle-detail-href';

type RelatedVehicle = {
  id: string;
  tenantId?: string;
  sellerId?: string;
  year?: number;
  make?: string;
  model?: string;
  price?: number;
  currency?: string;
  mileage?: number;
  photos?: string[];
  images?: string[];
};

function pickVehicles(payload: unknown): RelatedVehicle[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;
  const list = data.vehicles ?? data.inventory;
  return Array.isArray(list) ? (list as RelatedVehicle[]) : [];
}

function scoreVehicle(candidate: RelatedVehicle, current: RelatedVehicle): number {
  let score = 0;
  if (candidate.make && current.make && candidate.make.toLowerCase() === current.make.toLowerCase()) {
    score += 40;
  }
  if (candidate.model && current.model && candidate.model.toLowerCase() === current.model.toLowerCase()) {
    score += 20;
  }
  const priceA = Number(candidate.price || 0);
  const priceB = Number(current.price || 0);
  if (priceA > 0 && priceB > 0) {
    const diff = Math.abs(priceA - priceB) / priceB;
    if (diff <= 0.25) score += 20;
    else if (diff <= 0.5) score += 10;
  }
  const yearA = Number(candidate.year || 0);
  const yearB = Number(current.year || 0);
  if (yearA && yearB && Math.abs(yearA - yearB) <= 3) score += 10;
  return score;
}

export default function RelatedVehiclesSection({
  currentVehicle,
  tenantId,
  sellerId,
  source,
  fallbackHref,
}: {
  currentVehicle: RelatedVehicle;
  tenantId: string;
  sellerId?: string | null;
  source?: string | null;
  fallbackHref?: string;
}) {
  const [vehicles, setVehicles] = useState<RelatedVehicle[]>([]);
  const [scopeLabel, setScopeLabel] = useState('Más vehículos');

  useEffect(() => {
    let cancelled = false;
    const privateHost =
      typeof window !== 'undefined' && isTenantSubdomainHost(window.location.hostname);
    const isOwnerScope = privateHost || Boolean(sellerId) || source === 'dealer';

    (async () => {
      try {
        let rows: RelatedVehicle[] = [];
        if (isOwnerScope && sellerId) {
          setScopeLabel('Más vehículos de este vendedor');
          const res = await fetch(`/api/public/seller/${encodeURIComponent(sellerId)}`, {
            cache: 'no-store',
          });
          if (res.ok) rows = pickVehicles(await res.json());
        } else if (isOwnerScope) {
          setScopeLabel('Más vehículos de este concesionario');
          const res = await fetch(`/api/tenant/${encodeURIComponent(tenantId)}`, { cache: 'no-store' });
          if (res.ok) rows = pickVehicles(await res.json());
        } else {
          setScopeLabel('Más vehículos del marketplace');
          const make = currentVehicle.make ? `make=${encodeURIComponent(currentVehicle.make)}&` : '';
          const res = await fetch(`/api/public/vehicles?${make}limit=24`, { cache: 'no-store' });
          if (res.ok) rows = pickVehicles(await res.json());
          if (rows.filter((v) => v.id !== currentVehicle.id).length < 4) {
            const extra = await fetch('/api/public/vehicles?limit=24', { cache: 'no-store' });
            if (extra.ok) {
              const more = pickVehicles(await extra.json());
              const seen = new Set(rows.map((v) => v.id));
              for (const item of more) {
                if (!seen.has(item.id)) {
                  rows.push(item);
                  seen.add(item.id);
                }
              }
            }
          }
        }

        const next = rows
          .filter((v) => v.id && v.id !== currentVehicle.id)
          .sort((a, b) => scoreVehicle(b, currentVehicle) - scoreVehicle(a, currentVehicle))
          .slice(0, 8);
        if (!cancelled) setVehicles(next);
      } catch {
        if (!cancelled) setVehicles([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentVehicle.id, currentVehicle.make, currentVehicle.model, currentVehicle.price, tenantId, sellerId, source]);

  if (vehicles.length === 0) return null;

  return (
    <section className="mt-14 border-t border-neutral-200 pt-10 sm:mt-16 sm:pt-12">
      <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-neutral-500">Inventario relacionado</p>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{scopeLabel}</h2>
        </div>
        {fallbackHref ? (
          <Link href={fallbackHref} className="text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-950">
            Ver catálogo
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {vehicles.map((vehicle) => {
          const href = buildPublicVehicleDetailHref({
            vehicleId: vehicle.id,
            tenantId: vehicle.tenantId || tenantId,
            sellerId: sellerId || vehicle.sellerId,
            source: source === 'dealer' ? 'dealer' : undefined,
          });
          const photo = getFirstPhoto(vehicle);
          return (
            <Link
              key={vehicle.id}
              href={href}
              className="group border border-neutral-200 bg-white transition hover:border-neutral-900"
            >
              <div className="h-28 bg-neutral-100 sm:h-36">
                {photo ? (
                  <VehicleImageFrame
                    src={photo}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="h-full w-full bg-neutral-100"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs tracking-wide text-neutral-400">
                    Sin foto
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  {vehicle.currency || '$'} {(vehicle.price || 0).toLocaleString()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
