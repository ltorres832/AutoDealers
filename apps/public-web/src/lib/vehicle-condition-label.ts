/** Etiqueta pública de condición (sin "Seminuevo" genérico que confunde con vehículos nuevos). */

export function isPublicVehicleNew(vehicle: {
  condition?: string;
  mileage?: number | null;
}): boolean {
  const c = String(vehicle.condition ?? '')
    .toLowerCase()
    .trim();
  if (c === 'new' || c === 'nuevo') return true;
  if (c === 'used' || c === 'usado' || c === 'seminuevo') return false;
  const miles = vehicle.mileage;
  if (miles != null && miles <= 10) return true;
  return false;
}

/** Devuelve null si no debe mostrarse badge (evita "Seminuevo" en autos nuevos sin condition). */
export function getPublicVehicleConditionLabel(vehicle: {
  condition?: string;
  mileage?: number | null;
}): string | null {
  const c = String(vehicle.condition ?? '')
    .toLowerCase()
    .trim();
  if (isPublicVehicleNew(vehicle)) return 'Nuevo';
  if (c === 'certified' || c === 'certificado') return 'Certificado';
  if (c === 'used' || c === 'usado' || c === 'seminuevo') return 'Usado';
  return null;
}

export function matchesPublicConditionFilter(
  vehicle: { condition?: string; mileage?: number | null },
  filterCondition: string
): boolean {
  const f = filterCondition.toLowerCase().trim();
  if (!f || f === 'all') return true;
  if (f === 'new') return isPublicVehicleNew(vehicle);
  if (f === 'used') return !isPublicVehicleNew(vehicle);
  return String(vehicle.condition ?? '').toLowerCase() === f;
}
