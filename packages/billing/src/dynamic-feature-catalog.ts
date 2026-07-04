import { getDynamicFeatures } from '@autodealers/core';
import type { DynamicFeatureCatalogEntry } from './membership-display';

/** Catálogo activo de features dinámicas creadas en admin (para etiquetas en UI). */
export async function getActiveDynamicFeatureCatalog(): Promise<DynamicFeatureCatalogEntry[]> {
  try {
    const features = await getDynamicFeatures(undefined, true);
    return features.map((f) => ({
      key: f.key,
      name: f.name,
      type: f.type,
      unit: f.unit,
    }));
  } catch (error) {
    console.warn('getActiveDynamicFeatureCatalog:', error);
    return [];
  }
}
