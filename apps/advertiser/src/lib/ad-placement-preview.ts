/** Dimensiones y layout de vista previa alineados con public-web. */

import { AD_PLACEMENT_DIMENSIONS } from '@autodealers/core/ad-placement-dimensions';
import { AD_PLACEMENT_LABELS, type AdPlacement } from './ad-placements';

export type { AdPlacement };

export type AdPreviewLayout = 'hero' | 'sidebar_card' | 'grid_card' | 'between_immersive' | 'vehicle_banner';

export interface PlacementPreviewSpec {
  label: string;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatio: string;
  layout: AdPreviewLayout;
  /** Altura del área de media en la vista previa (px). */
  mediaHeightPx: number;
  imageObjectFit: 'contain';
  maxUploadMb: number;
}

export const AD_PREVIEW_SPECS: Record<AdPlacement, PlacementPreviewSpec> = {
  hero: {
    label: AD_PLACEMENT_LABELS.hero,
    recommendedWidth: AD_PLACEMENT_DIMENSIONS.hero.width,
    recommendedHeight: AD_PLACEMENT_DIMENSIONS.hero.height,
    aspectRatio: AD_PLACEMENT_DIMENSIONS.hero.aspectRatio.replace(':', ' / '),
    layout: 'hero',
    mediaHeightPx: 288,
    imageObjectFit: 'contain',
    maxUploadMb: AD_PLACEMENT_DIMENSIONS.hero.maxUploadMb,
  },
  sidebar: {
    label: AD_PLACEMENT_LABELS.sidebar,
    recommendedWidth: AD_PLACEMENT_DIMENSIONS.sidebar.width,
    recommendedHeight: AD_PLACEMENT_DIMENSIONS.sidebar.height,
    aspectRatio: AD_PLACEMENT_DIMENSIONS.sidebar.aspectRatio.replace(':', ' / '),
    layout: 'sidebar_card',
    mediaHeightPx: 240,
    imageObjectFit: 'contain',
    maxUploadMb: AD_PLACEMENT_DIMENSIONS.sidebar.maxUploadMb,
  },
  sponsors_section: {
    label: AD_PLACEMENT_LABELS.sponsors_section,
    recommendedWidth: AD_PLACEMENT_DIMENSIONS.sponsors_section.width,
    recommendedHeight: AD_PLACEMENT_DIMENSIONS.sponsors_section.height,
    aspectRatio: AD_PLACEMENT_DIMENSIONS.sponsors_section.aspectRatio.replace(':', ' / '),
    layout: 'grid_card',
    mediaHeightPx: 224,
    imageObjectFit: 'contain',
    maxUploadMb: AD_PLACEMENT_DIMENSIONS.sponsors_section.maxUploadMb,
  },
  between_content: {
    label: AD_PLACEMENT_LABELS.between_content,
    recommendedWidth: AD_PLACEMENT_DIMENSIONS.between_content.width,
    recommendedHeight: AD_PLACEMENT_DIMENSIONS.between_content.height,
    aspectRatio: AD_PLACEMENT_DIMENSIONS.between_content.aspectRatio.replace(':', ' / '),
    layout: 'between_immersive',
    mediaHeightPx: 320,
    imageObjectFit: 'contain',
    maxUploadMb: AD_PLACEMENT_DIMENSIONS.between_content.maxUploadMb,
  },
  vehicle_page: {
    label: AD_PLACEMENT_LABELS.vehicle_page,
    recommendedWidth: AD_PLACEMENT_DIMENSIONS.vehicle_page.width,
    recommendedHeight: AD_PLACEMENT_DIMENSIONS.vehicle_page.height,
    aspectRatio: AD_PLACEMENT_DIMENSIONS.vehicle_page.aspectRatio.replace(':', ' / '),
    layout: 'vehicle_banner',
    mediaHeightPx: 180,
    imageObjectFit: 'contain',
    maxUploadMb: AD_PLACEMENT_DIMENSIONS.vehicle_page.maxUploadMb,
  },
};

export function getPlacementPreviewSpec(placement: AdPlacement): PlacementPreviewSpec {
  return AD_PREVIEW_SPECS[placement];
}

/** Texto legible del tamaño exacto en píxeles (fuente única para UI y optimización). */
export function formatPlacementPixelSize(
  spec: Pick<PlacementPreviewSpec, 'recommendedWidth' | 'recommendedHeight'>
): string {
  return `${spec.recommendedWidth} × ${spec.recommendedHeight} px`;
}

export function formatPlacementAspectRatio(spec: Pick<PlacementPreviewSpec, 'aspectRatio'>): string {
  return spec.aspectRatio.replace(/\s*\/\s*/g, ':').replace(/\s+/g, '');
}

export function getPlacementDimensionSummary(placement: AdPlacement): {
  placement: AdPlacement;
  label: string;
  width: number;
  height: number;
  pixelSize: string;
  aspectRatio: string;
  maxUploadMb: number;
} {
  const spec = getPlacementPreviewSpec(placement);
  return {
    placement,
    label: spec.label,
    width: spec.recommendedWidth,
    height: spec.recommendedHeight,
    pixelSize: formatPlacementPixelSize(spec),
    aspectRatio: formatPlacementAspectRatio(spec),
    maxUploadMb: spec.maxUploadMb,
  };
}

export function getAllPlacementDimensionSummaries(): ReturnType<typeof getPlacementDimensionSummary>[] {
  return (Object.keys(AD_PREVIEW_SPECS) as AdPlacement[]).map(getPlacementDimensionSummary);
}
