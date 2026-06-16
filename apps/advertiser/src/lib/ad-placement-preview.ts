/** Dimensiones y layout de vista previa alineados con public-web. */

export type AdPlacement = 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';

export type AdPreviewLayout = 'hero' | 'sidebar_card' | 'grid_card' | 'between_immersive';

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
    label: 'Hero (principal)',
    recommendedWidth: 1920,
    recommendedHeight: 600,
    aspectRatio: '16 / 5',
    layout: 'hero',
    mediaHeightPx: 288,
    imageObjectFit: 'contain',
    maxUploadMb: 20,
  },
  sidebar: {
    label: 'Sidebar',
    recommendedWidth: 400,
    recommendedHeight: 300,
    aspectRatio: '4 / 3',
    layout: 'sidebar_card',
    mediaHeightPx: 240,
    imageObjectFit: 'contain',
    maxUploadMb: 20,
  },
  sponsors_section: {
    label: 'Sección patrocinadores',
    recommendedWidth: 400,
    recommendedHeight: 300,
    aspectRatio: '4 / 3',
    layout: 'grid_card',
    mediaHeightPx: 224,
    imageObjectFit: 'contain',
    maxUploadMb: 20,
  },
  between_content: {
    label: 'Entre contenido',
    recommendedWidth: 1200,
    recommendedHeight: 384,
    aspectRatio: '25 / 8',
    layout: 'between_immersive',
    mediaHeightPx: 320,
    imageObjectFit: 'contain',
    maxUploadMb: 20,
  },
};

export function getPlacementPreviewSpec(placement: AdPlacement): PlacementPreviewSpec {
  return AD_PREVIEW_SPECS[placement];
}
