/**
 * Registra un clic/interés anónimo hacia un vehículo del catálogo público.
 * No incluye datos personales (solo contexto: superficie, ruta, referrer, UTM).
 * El servidor guarda `vehicle_interest_signals` para que el dealer analice tráfico.
 */
export type CatalogVehicleClickSurface =
  | 'catalog_home_grid'
  | 'catalog_home_list'
  | 'featured_carousel'
  | 'promotion'
  | 'banner_vehicle'
  | 'tenant_site_modal'
  | 'vehicle_detail'
  | 'seller_inventory'
  | 'dealer_inventory'
  | 'category'
  | 'compare'
  | string;

function utmFromLocation(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const src = p.get('utm_source') || p.get('utmSource');
  const med = p.get('utm_medium');
  const camp = p.get('utm_campaign');
  return {
    ...(src ? { utmSource: src.slice(0, 120) } : {}),
    ...(med ? { utmMedium: med.slice(0, 120) } : {}),
    ...(camp ? { utmCampaign: camp.slice(0, 120) } : {}),
  };
}

/** Contexto del navegador para la API (ruta, referrer, UTM). */
export function getCatalogClickContext(): {
  path: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  return {
    path: typeof window !== 'undefined' ? window.location.pathname.slice(0, 400) : '',
    referrer: typeof document !== 'undefined' ? (document.referrer || '').slice(0, 500) : '',
    ...utmFromLocation(),
  };
}

export function pingCatalogVehicleClick(opts: {
  vehicleId: string;
  tenantId: string;
  surface: CatalogVehicleClickSurface;
}): void {
  const { vehicleId, tenantId, surface } = opts;
  if (!vehicleId || !tenantId) return;

  const payload = JSON.stringify({
    tenantId,
    surface: String(surface).slice(0, 64),
    ...getCatalogClickContext(),
  });

  const url = `/api/public/vehicles/${encodeURIComponent(vehicleId)}/view?tenantId=${encodeURIComponent(tenantId)}`;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      if (ok) return;
    }
  } catch {
    /* fall through */
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
