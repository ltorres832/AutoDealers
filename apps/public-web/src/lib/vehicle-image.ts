/**
 * Utilidad para manejar imágenes de vehículos de forma consistente
 * entre localhost y hosting. Soporta both photos e images (legacy).
 */

import type { SyntheticEvent } from 'react';
import { getVehiclePhotosRaw } from './vehicle-photos-normalize';

const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f1f5f9' width='400' height='300'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='20' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3E🚗 Sin Foto%3C/text%3E%3C/svg%3E";

/**
 * Obtiene el array de fotos de un vehículo (soporta photos e images)
 */
export function getVehiclePhotos(vehicle: { photos?: string[]; images?: string[] }): string[] {
  const photos = getVehiclePhotosRaw(vehicle);
  return photos;
}

/**
 * Obtiene la primera foto válida de un vehículo
 */
export function getFirstPhoto(vehicle: { photos?: string[]; images?: string[] }): string | null {
  const photos = getVehiclePhotos(vehicle);
  const first = photos[0]?.trim();
  return first || null;
}

/**
 * URL del placeholder cuando no hay imagen o falla
 */
export function getPlaceholderUrl(): string {
  return PLACEHOLDER_SVG;
}

/**
 * Handler onError para imágenes - reemplaza por placeholder
 */
export function handleImageError(e: SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  target.src = PLACEHOLDER_SVG;
  target.onerror = null;
}
