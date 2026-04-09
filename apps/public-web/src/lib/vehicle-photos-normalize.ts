/**
 * Normalización de fotos (solo lógica, sin React) — usar en API routes y servidor.
 */

export function getVehiclePhotosRaw(vehicle: { photos?: unknown; images?: unknown }): string[] {
  const raw = Array.isArray(vehicle.photos)
    ? vehicle.photos
    : Array.isArray(vehicle.images)
      ? vehicle.images
      : [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is string =>
      typeof p === 'string' &&
      p.trim() !== '' &&
      p !== 'undefined' &&
      !String(p).includes('undefined')
  );
}

/** Asegura `photos` limpio y opcionalmente elimina `images` del payload JSON */
export function normalizeVehiclePayload<T extends Record<string, unknown>>(v: T): T & { photos: string[] } {
  const photos = getVehiclePhotosRaw(v);
  const { images: _i, ...rest } = v;
  return { ...rest, photos } as T & { photos: string[] };
}

export function normalizeVehiclesArray<T extends Record<string, unknown>>(list: T[]): (T & { photos: string[] })[] {
  return list.map((v) => normalizeVehiclePayload(v));
}
