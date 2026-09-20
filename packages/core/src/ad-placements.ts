/** Catálogo único de ubicaciones de anuncio: ids, textos ES, precios y cupos. */

import {
  AD_PLACEMENT_DIMENSIONS,
  AD_PLACEMENT_IDS,
  formatAdPlacementPixelSize,
  isAdPlacementId,
  type AdPlacementId,
} from './ad-placement-dimensions';

export type AdPlacement = AdPlacementId;

export type PromoPlacementId = AdPlacementId | 'promotions_section';

export const PROMO_PLACEMENT_IDS: PromoPlacementId[] = [
  ...AD_PLACEMENT_IDS,
  'promotions_section',
];

export const AD_PLACEMENT_LABELS: Record<AdPlacementId, string> = {
  hero: 'Arriba de la home — banner grande',
  sidebar: 'Al lado del inventario',
  between_content: 'Banner ancho al final de la home',
  sponsors_section: 'Ofertas recomendadas / Red de socios',
  vehicle_page: 'En la ficha de cada vehículo',
};

export const PROMO_PLACEMENT_LABELS: Record<PromoPlacementId, string> = {
  ...AD_PLACEMENT_LABELS,
  promotions_section: 'Sección de promociones',
};

export const AD_PLACEMENT_WHERE: Record<AdPlacementId, string> = {
  hero: 'En www, lo primero al entrar: el banner grande de todo el ancho, justo debajo del menú (antes del buscador). También sale arriba en la página de un concesionario o vendedor.',
  sidebar:
    'En www, en la columna IZQUIERDA del inventario de autos (junto a la lista de vehículos). En celular queda junto a la lista, no arriba del todo.',
  between_content:
    'En www, baja casi al FINAL de la home: DESPUÉS de reseñas y concesionarios, y ANTES del bloque de 3 tarjetas “Ofertas recomendadas” y del formulario de contacto. Es un banner ANCHO que cruza la página. En la página de un concesionario o vendedor, este banner y las 3 ofertas salen ARRIBA del inventario.',
  sponsors_section:
    'En www, el bloque titulado “Ofertas Recomendadas / Red de socios”: 3 tarjetas juntas, JUSTO DEBAJO del banner ancho y ANTES de “por qué elegirnos” y el formulario de contacto. En la página de un concesionario o vendedor, este bloque y el banner ancho salen ARRIBA del inventario.',
  vehicle_page:
    'En la ficha de CADA vehículo (cualquier auto que abras): DESPUÉS de la ficha técnica y ANTES de más fotos / vehículos relacionados. Es un recuadro más ancho y menos alto (760 × 300 px), centrado — no el banner ancho de 1200 px de la home. Sale en todas las fichas, no solo en un concesionario.',
};

export const AD_PLACEMENT_NOT_WHERE: Record<AdPlacementId, string> = {
  hero: 'No sale en el inventario, ni abajo de la home, ni en la ficha del auto.',
  sidebar: 'No sale arriba de la home ni en la ficha del auto. No es el bloque de 3 ofertas.',
  between_content: 'No sale arriba ni en la ficha del auto.',
  sponsors_section: 'No es el banner de arriba ni el banner ancho. No sale en la ficha del auto.',
  vehicle_page: 'No sale en la home. No es el banner ancho entre secciones. Solo en la página de cada vehículo.',
};

export const AD_PLACEMENT_DESCRIPTIONS: Record<AdPlacementId, string> = {
  hero: AD_PLACEMENT_WHERE.hero + ' Rota un anuncio a la vez.',
  sidebar: AD_PLACEMENT_WHERE.sidebar + ' Se muestran 2 a la vez y rotan.',
  between_content: AD_PLACEMENT_WHERE.between_content + ' Rota un anuncio a la vez.',
  sponsors_section: AD_PLACEMENT_WHERE.sponsors_section + ' Se muestran 3 a la vez y rotan.',
  vehicle_page: AD_PLACEMENT_WHERE.vehicle_page + ' Rota un anuncio a la vez.',
};

export const PROMO_PLACEMENT_DESCRIPTIONS: Record<PromoPlacementId, string> = {
  ...AD_PLACEMENT_DESCRIPTIONS,
  promotions_section: 'Sale en el bloque de promociones de la página pública. Varias promociones activas rotan juntas.',
};

export const AD_PLACEMENT_CAPACITY: Record<AdPlacementId, number> = {
  hero: 5,
  sidebar: 10,
  between_content: 5,
  sponsors_section: 12,
  vehicle_page: 8,
};

export const AD_PLACEMENT_VISIBLE_SLOTS: Record<AdPlacementId, number> = {
  hero: 1,
  sidebar: 2,
  between_content: 1,
  sponsors_section: 3,
  vehicle_page: 1,
};

export const DEFAULT_BANNER_PLACEMENT_PRICES: Record<AdPlacementId, Record<7 | 15 | 30, number>> = {
  hero: { 7: 199, 15: 349, 30: 599 },
  sidebar: { 7: 99, 15: 149, 30: 299 },
  between_content: { 7: 149, 15: 249, 30: 449 },
  sponsors_section: { 7: 79, 15: 129, 30: 229 },
  vehicle_page: { 7: 119, 15: 199, 30: 349 },
};

export const DEFAULT_BANNER_PLACEMENT_CONFIG: Record<
  AdPlacementId,
  { durations: number[]; prices: Record<number, number> }
> = {
  hero: { durations: [7, 15, 30], prices: { ...DEFAULT_BANNER_PLACEMENT_PRICES.hero } },
  sidebar: { durations: [7, 15, 30], prices: { ...DEFAULT_BANNER_PLACEMENT_PRICES.sidebar } },
  between_content: { durations: [7, 15, 30], prices: { ...DEFAULT_BANNER_PLACEMENT_PRICES.between_content } },
  sponsors_section: { durations: [7, 15, 30], prices: { ...DEFAULT_BANNER_PLACEMENT_PRICES.sponsors_section } },
  vehicle_page: { durations: [7, 15, 30], prices: { ...DEFAULT_BANNER_PLACEMENT_PRICES.vehicle_page } },
};

export function isAdPlacement(value: unknown): value is AdPlacementId {
  return typeof value === 'string' && isAdPlacementId(value);
}

export function isPromoPlacement(value: unknown): value is PromoPlacementId {
  return value === 'promotions_section' || isAdPlacement(value);
}

export function parseAdPlacement(value: unknown, fallback: AdPlacementId = 'hero'): AdPlacementId {
  return isAdPlacement(value) ? value : fallback;
}

export function parsePromoPlacement(
  value: unknown,
  fallback: PromoPlacementId = 'promotions_section'
): PromoPlacementId {
  return isPromoPlacement(value) ? value : fallback;
}

export interface AdPlacementOption {
  id: AdPlacementId;
  label: string;
  description: string;
  where: string;
  notWhere: string;
  pixelSize: string;
  aspectRatio: string;
  width: number;
  height: number;
  maxUploadMb: number;
  capacity: number;
  visibleSlots: number;
  defaultPrices: Record<7 | 15 | 30, number>;
}

export function getAdPlacementOption(id: AdPlacementId): AdPlacementOption {
  const spec = AD_PLACEMENT_DIMENSIONS[id];
  return {
    id,
    label: AD_PLACEMENT_LABELS[id],
    description: AD_PLACEMENT_DESCRIPTIONS[id],
    where: AD_PLACEMENT_WHERE[id],
    notWhere: AD_PLACEMENT_NOT_WHERE[id],
    pixelSize: formatAdPlacementPixelSize(spec),
    aspectRatio: spec.aspectRatio,
    width: spec.width,
    height: spec.height,
    maxUploadMb: spec.maxUploadMb,
    capacity: AD_PLACEMENT_CAPACITY[id],
    visibleSlots: AD_PLACEMENT_VISIBLE_SLOTS[id],
    defaultPrices: DEFAULT_BANNER_PLACEMENT_PRICES[id],
  };
}

export function listAdPlacementOptions(): AdPlacementOption[] {
  return AD_PLACEMENT_IDS.map(getAdPlacementOption);
}

export function listPromoPlacementOptions(): Array<{
  id: PromoPlacementId;
  label: string;
  description: string;
  notWhere?: string;
}> {
  return PROMO_PLACEMENT_IDS.map((id) => ({
    id,
    label: PROMO_PLACEMENT_LABELS[id],
    description: PROMO_PLACEMENT_DESCRIPTIONS[id],
    notWhere: isAdPlacement(id) ? AD_PLACEMENT_NOT_WHERE[id] : undefined,
  }));
}

export function mergeStoredBannerPlacements(
  stored: Record<string, { durations?: number[]; prices?: Record<number, number> }> | undefined
): Record<AdPlacementId, { durations: number[]; prices: Record<number, number> }> {
  const source = stored || {};
  const next = {} as Record<AdPlacementId, { durations: number[]; prices: Record<number, number> }>;
  for (const id of AD_PLACEMENT_IDS) {
    const current = source[id];
    next[id] = {
      durations: current?.durations?.length ? current.durations : DEFAULT_BANNER_PLACEMENT_CONFIG[id].durations,
      prices: {
        ...DEFAULT_BANNER_PLACEMENT_CONFIG[id].prices,
        ...(current?.prices || {}),
      },
    };
  }
  return next;
}
