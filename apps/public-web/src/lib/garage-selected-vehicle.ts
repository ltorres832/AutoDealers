export type SelectedGarageVehicle = {
  id: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
};

const STORAGE_KEY = 'garageSelectedVehicle';

export function garageVehicleLabel(vehicle?: {
  year?: number | string;
  make?: string;
  model?: string;
  trim?: string;
} | null): string {
  if (!vehicle) return '';
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ');
}

export function readSelectedGarageVehicle(): SelectedGarageVehicle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id && !parsed?.make && !parsed?.model) return null;
    return {
      id: String(parsed.id || ''),
      year: parsed.year ? Number(parsed.year) : undefined,
      make: parsed.make ? String(parsed.make) : undefined,
      model: parsed.model ? String(parsed.model) : undefined,
      trim: parsed.trim ? String(parsed.trim) : undefined,
    };
  } catch {
    return null;
  }
}

export function writeSelectedGarageVehicle(vehicle?: SelectedGarageVehicle | null): void {
  if (typeof window === 'undefined') return;
  if (!vehicle?.id && !vehicle?.make) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle));
}

export function serviciosHrefForVehicle(
  vehicle?: SelectedGarageVehicle | null,
  categorySlug?: string
): string {
  const base = categorySlug ? `/servicios/${encodeURIComponent(categorySlug)}` : '/servicios';
  if (!vehicle?.make && !vehicle?.model && !vehicle?.year) return base;
  const params = new URLSearchParams();
  if (vehicle.year) params.set('year', String(vehicle.year));
  if (vehicle.make) params.set('make', vehicle.make);
  if (vehicle.model) params.set('model', vehicle.model);
  if (vehicle.id) params.set('vehicleId', vehicle.id);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
