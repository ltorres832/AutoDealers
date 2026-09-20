import {
  AD_PLACEMENT_DIMENSIONS,
  formatAdPlacementPixelSize,
  isAdPlacementId,
  type AdPlacementId,
} from '@autodealers/core/ad-placement-dimensions';
import { AD_PLACEMENT_LABELS, listAdPlacementOptions } from '@autodealers/core/ad-placements';

export const AD_PLACEMENT_PUBLIC_LABELS = AD_PLACEMENT_LABELS;

export function getPlacementDisplayRows() {
  return listAdPlacementOptions().map((row) => ({
    id: row.id,
    label: row.label,
    where: row.where,
    notWhere: row.notWhere,
    pixelSize: row.pixelSize,
    aspectRatio: row.aspectRatio,
    width: row.width,
    height: row.height,
    maxUploadMb: row.maxUploadMb,
  }));
}

export function enrichPlacementWithDimensions<T extends { id: string; label?: string }>(placement: T) {
  if (!isAdPlacementId(placement.id)) return placement;
  const spec = AD_PLACEMENT_DIMENSIONS[placement.id];
  return {
    ...placement,
    label: placement.label || AD_PLACEMENT_LABELS[placement.id],
    imageWidth: spec.width,
    imageHeight: spec.height,
    imageSize: formatAdPlacementPixelSize(spec),
    aspectRatio: spec.aspectRatio,
    maxUploadMb: spec.maxUploadMb,
  };
}

export type { AdPlacementId };
