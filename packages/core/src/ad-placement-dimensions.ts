/** Tamaños exactos de imagen por ubicación — fuente única para UI, optimización y API pública. */

export type AdPlacementId =
  | 'hero'
  | 'sidebar'
  | 'sponsors_section'
  | 'between_content'
  | 'vehicle_page';

export const AD_PLACEMENT_IDS: AdPlacementId[] = [
  'hero',
  'sidebar',
  'sponsors_section',
  'between_content',
  'vehicle_page',
];

export interface AdPlacementDimensionSpec {
  width: number;
  height: number;
  /** Proporción legible, p. ej. "16:5" */
  aspectRatio: string;
  maxUploadMb: number;
}

export const AD_PLACEMENT_DIMENSIONS: Record<AdPlacementId, AdPlacementDimensionSpec> = {
  hero: {
    width: 1920,
    height: 600,
    aspectRatio: '16:5',
    maxUploadMb: 20,
  },
  sidebar: {
    width: 400,
    height: 300,
    aspectRatio: '4:3',
    maxUploadMb: 20,
  },
  sponsors_section: {
    width: 400,
    height: 300,
    aspectRatio: '4:3',
    maxUploadMb: 20,
  },
  between_content: {
    width: 1200,
    height: 384,
    aspectRatio: '25:8',
    maxUploadMb: 20,
  },
  /** Banner apaisado en la ficha (más ancho y menos alto que 640×400; no el strip de 1200 px de la home). */
  vehicle_page: {
    width: 760,
    height: 300,
    aspectRatio: '38:15',
    maxUploadMb: 20,
  },
};

export function formatAdPlacementPixelSize(
  spec: Pick<AdPlacementDimensionSpec, 'width' | 'height'>
): string {
  return `${spec.width} × ${spec.height} px`;
}

export function getAdPlacementDimensionSpec(placement: AdPlacementId): AdPlacementDimensionSpec {
  return AD_PLACEMENT_DIMENSIONS[placement];
}

/** CSS `aspect-ratio` from the official pixel canvas, e.g. "760 / 300". */
export function adPlacementCssAspectRatio(placement: AdPlacementId): string {
  const spec = AD_PLACEMENT_DIMENSIONS[placement];
  return `${spec.width} / ${spec.height}`;
}

export function adPlacementFrameStyle(placement: AdPlacementId): {
  aspectRatio: string;
  width: string;
  maxWidth?: string;
  height?: string;
  maxHeight?: string;
  minHeight?: string;
  display?: string;
  overflow?: string;
  position?: string;
} {
  const spec = AD_PLACEMENT_DIMENSIONS[placement];
  if (placement === 'vehicle_page') {
    return {
      aspectRatio: `${spec.width} / ${spec.height}`,
      width: '100%',
      maxWidth: `${spec.width}px`,
      height: 'auto',
      maxHeight: `${spec.height}px`,
      // Floor so an inline/absolute remnant cannot collapse to height 0
      // and paint overlay copy over the specs table. Keep below aspect height on phones.
      minHeight: '120px',
      display: 'block',
      overflow: 'hidden',
      position: 'relative',
    };
  }
  return { aspectRatio: adPlacementCssAspectRatio(placement), width: '100%' };
}

export function isAdPlacementId(value: string): value is AdPlacementId {
  return value in AD_PLACEMENT_DIMENSIONS;
}
