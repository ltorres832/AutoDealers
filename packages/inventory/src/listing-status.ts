/** Helpers sin dependencias de servidor (UI pública y paneles). */

export function normalizeVehicleStatus(raw: unknown): string {
  return String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

export function vehicleStatusLabel(status: string): string {
  const st = normalizeVehicleStatus(status);
  if (st === 'available') return 'Disponible';
  if (st === 'sold') return 'Vendido';
  if (st === 'sold_external') return 'Vendido (externo)';
  if (st === 'hidden') return 'Oculto';
  if (st === 'reserved') return 'Reservado';
  if (st.startsWith('sold_')) return 'Vendido';
  return status || '—';
}

/** Estados que el panel puede volver a «disponible» con reactivate. */
export function canReactivateVehicleStatus(status: unknown): boolean {
  const st = normalizeVehicleStatus(status);
  if (st === 'available') return false;
  if (st === 'sold' || st === 'hidden') return true;
  if (st === 'sold_external' || st === 'sold_pending_verification' || st === 'sold_verified') {
    return true;
  }
  if (st.startsWith('sold')) return true;
  return false;
}

export function isVehicleAvailableStatus(status: unknown): boolean {
  return normalizeVehicleStatus(status) === 'available';
}

export function shouldShowSoldOverlay(vehicle: {
  status?: string;
  showSoldBadge?: boolean;
}): boolean {
  const st = normalizeVehicleStatus(vehicle.status);
  return st === 'sold' || vehicle.showSoldBadge === true;
}

export function isListedOnPublicCatalog(vehicle: Record<string, unknown>): boolean {
  if (vehicle.deleted === true) return false;
  const st = normalizeVehicleStatus(vehicle.status);
  if (st === 'hidden' || st === 'deleted') return false;
  if (st === 'sold') return vehicle.showPublicSoldBadge === true;
  return true;
}
