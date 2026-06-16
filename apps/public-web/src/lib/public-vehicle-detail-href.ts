/** URL de detalle público de un vehículo (tenant correcto + contexto de vendedor si aplica). */
export function buildPublicVehicleDetailHref(opts: {
  vehicleId: string;
  tenantId: string;
  sellerId?: string;
}): string {
  const tenantSegment = opts.tenantId.trim();
  const params = new URLSearchParams();
  if (opts.sellerId?.trim()) {
    params.set('sellerId', opts.sellerId.trim());
  }
  const qs = params.toString();
  return `/${tenantSegment}/vehicle/${opts.vehicleId}${qs ? `?${qs}` : ''}`;
}

export function vehicleCatalogTenantId(
  vehicle: { tenantId?: string },
  fallbackTenantId: string
): string {
  return String(vehicle.tenantId || fallbackTenantId).trim();
}
