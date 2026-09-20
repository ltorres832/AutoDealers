'use client';

import type { ReactNode } from 'react';
import {
  AD_PLACEMENT_NOT_WHERE,
  AD_PLACEMENT_WHERE,
  getAdPlacementOption,
  isAdPlacement,
  type AdPlacement,
  type PromoPlacementId,
} from './ad-placements';
import { AD_PLACEMENT_DIMENSIONS, adPlacementCssAspectRatio } from './ad-placement-dimensions';

type MapSlot = AdPlacement | 'nav' | 'search' | 'inventory' | 'mid' | 'contact' | 'gallery' | 'specs' | 'related';

function slotTone(active: boolean, dimOthers: boolean) {
  if (active) {
    return 'relative z-10 scale-[1.04] sm:scale-110 border-2 border-primary-500 bg-primary-50 text-primary-950 shadow-lg shadow-primary-500/20';
  }
  if (dimOthers) {
    return 'border border-slate-200 bg-slate-100/70 text-slate-400 opacity-40';
  }
  return 'border border-slate-200 bg-white text-slate-600';
}

function SlotLabel({
  active,
  children,
  size,
}: {
  active: boolean;
  children: ReactNode;
  size?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-center">
      <span className={`leading-tight ${active ? 'text-[11px] font-black sm:text-xs' : 'text-[10px] font-semibold sm:text-[11px]'}`}>
        {children}
      </span>
      {size ? <span className={`tabular-nums ${active ? 'text-[10px] font-bold text-primary-700' : 'text-[9px]'}`}>{size}</span> : null}
      {active ? (
        <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
          Aquí va tu anuncio
        </span>
      ) : null}
    </div>
  );
}

function HomePageMap({ placement }: { placement: AdPlacement }) {
  const dim = true;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate text-[10px] text-slate-500">www.autodealers-online.com</span>
      </div>
      <div className="space-y-1.5 p-2 sm:p-3">
        <div className={`rounded-md ${slotTone(false, dim)}`}>
          <SlotLabel active={false}>Menú</SlotLabel>
        </div>
        <div className={`rounded-md ${slotTone(placement === 'hero', dim)}`} style={{ minHeight: placement === 'hero' ? 72 : 36 }}>
          <SlotLabel active={placement === 'hero'} size="1920 × 600">
            1. Banner grande de arriba
          </SlotLabel>
        </div>
        <div className={`rounded-md ${slotTone(false, dim)}`}>
          <SlotLabel active={false}>2. Buscador “Encuentra tu vehículo”</SlotLabel>
        </div>
        <div className="grid grid-cols-[88px_1fr] gap-1.5 sm:grid-cols-[120px_1fr]">
          <div
            className={`rounded-md ${slotTone(placement === 'sidebar', dim)}`}
            style={{ minHeight: placement === 'sidebar' ? 88 : 56 }}
          >
            <SlotLabel active={placement === 'sidebar'} size="400 × 300">
              3. Al lado del inventario
            </SlotLabel>
          </div>
          <div className={`rounded-md ${slotTone(false, dim)}`}>
            <SlotLabel active={false}>Lista de autos</SlotLabel>
          </div>
        </div>
        <div className={`rounded-md ${slotTone(false, dim)}`}>
          <SlotLabel active={false}>4. Calculadora, promociones, concesionarios, reseñas</SlotLabel>
        </div>
        <div
          className={`rounded-md ${slotTone(placement === 'between_content', dim)}`}
          style={{ minHeight: placement === 'between_content' ? 64 : 32 }}
        >
          <SlotLabel active={placement === 'between_content'} size="1200 × 384">
            5. Banner ancho (casi al final)
          </SlotLabel>
        </div>
        <div
          className={`grid grid-cols-3 gap-1.5 rounded-md p-1.5 ${
            placement === 'sponsors_section'
              ? 'scale-[1.04] border-2 border-primary-500 bg-primary-50 shadow-lg sm:scale-110'
              : 'border border-slate-200 bg-slate-100/70 opacity-40'
          }`}
        >
          {['A', 'B', 'C'].map((card) => (
            <div
              key={card}
              className={`rounded-md ${
                placement === 'sponsors_section'
                  ? 'border border-primary-300 bg-white'
                  : 'border border-slate-200 bg-white'
              }`}
            >
              <SlotLabel active={placement === 'sponsors_section' && card === 'B'} size={card === 'B' ? '400 × 300' : undefined}>
                {card === 'B' ? '6. Ofertas / socios' : 'Tarjeta'}
              </SlotLabel>
            </div>
          ))}
        </div>
        <div className={`rounded-md ${slotTone(false, dim)}`}>
          <SlotLabel active={false}>7. Formulario de contacto y pie</SlotLabel>
        </div>
      </div>
    </div>
  );
}

function VehiclePageMap({ placement }: { placement: AdPlacement }) {
  const rows: Array<{ id: MapSlot; label: string; size?: string; slot?: AdPlacement }> = [
    { id: 'gallery', label: 'Fotos del auto' },
    { id: 'specs', label: 'Ficha técnica' },
    { id: 'vehicle_page', label: 'Banner de la ficha', size: `${AD_PLACEMENT_DIMENSIONS.vehicle_page.width} × ${AD_PLACEMENT_DIMENSIONS.vehicle_page.height}`, slot: 'vehicle_page' },
    { id: 'related', label: 'Más fotos / vehículos relacionados' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate text-[10px] text-slate-500">Ficha del vehículo</span>
      </div>
      <div className="space-y-1.5 p-2 sm:p-3">
        {rows.map((row) => {
          const active = row.slot === placement;
          return (
            <div
              key={row.id}
              className={`rounded-md ${slotTone(active, true)}`}
              style={{ minHeight: active ? 72 : 36 }}
            >
              <SlotLabel active={active} size={row.size}>
                {row.label}
              </SlotLabel>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniBannerFrame({ placement }: { placement: AdPlacement }) {
  const option = getAdPlacementOption(placement);
  const frame =
    placement === 'hero'
      ? 'h-16 w-full rounded-2xl bg-gradient-to-r from-slate-900 via-primary-800 to-slate-900'
      : placement === 'between_content'
        ? 'h-14 w-full rounded-3xl bg-gradient-to-r from-slate-900 via-primary-900 to-slate-800'
        : placement === 'vehicle_page'
          ? 'w-full max-w-[280px] rounded-xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900'
          : 'aspect-[4/3] w-40 rounded-3xl bg-white shadow-md ring-1 ring-slate-200';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Así se ve el marco del anuncio
      </p>
      <div className="flex justify-center bg-slate-50 p-3">
        <div
          className={`relative overflow-hidden ${frame}`}
          style={
            placement === 'vehicle_page'
              ? { aspectRatio: adPlacementCssAspectRatio('vehicle_page') }
              : undefined
          }
        >
          {placement === 'sponsors_section' || placement === 'sidebar' ? (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-primary-800" />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded bg-black/50 px-2 py-1 text-[10px] font-bold text-white">
              {option.pixelSize}
            </span>
          </div>
        </div>
      </div>
      {placement === 'sponsors_section' ? (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Tu anuncio es una de las 3 tarjetas del bloque.
        </p>
      ) : null}
    </div>
  );
}

export function AdPlacementPageMap({ placement }: { placement: AdPlacement }) {
  const option = getAdPlacementOption(placement);
  const isVehicle = placement === 'vehicle_page';

  return (
    <div className="overflow-hidden rounded-xl border-2 border-primary-200 bg-white">
      <div className="border-b border-primary-100 bg-primary-50/80 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
          Ubicación seleccionada
        </p>
        <h4 className="mt-0.5 text-base font-black text-slate-900">{option.label}</h4>
        <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl">
          {option.pixelSize}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{AD_PLACEMENT_WHERE[placement]}</p>
        <p className="mt-2 text-sm font-medium text-amber-800">{AD_PLACEMENT_NOT_WHERE[placement]}</p>
      </div>
      <div className="grid gap-3 p-3 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {isVehicle ? 'Mapa de la ficha del auto' : 'Mapa de la home (www)'}
          </p>
          {isVehicle ? <VehiclePageMap placement={placement} /> : <HomePageMap placement={placement} />}
        </div>
        <MiniBannerFrame placement={placement} />
      </div>
    </div>
  );
}

export function AdPlacementExplainer({
  placement,
}: {
  placement: AdPlacement | PromoPlacementId | string;
}) {
  if (!isAdPlacement(placement)) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Esta ubicación es la sección de promociones del sitio público. No es un banner de la home ni de la
        ficha del auto.
      </div>
    );
  }
  return <AdPlacementPageMap placement={placement} />;
}
