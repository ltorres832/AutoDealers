/** URL de detalle público de un vehículo (tenant correcto + contexto de vendedor si aplica). */
export function isTenantSubdomainHost(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase();
  if (!host || host === 'localhost' || host.startsWith('www.')) return false;
  if (host.endsWith('.localhost')) return true;
  if (!host.endsWith('.autodealers-online.com')) return false;
  const subdomain = host.slice(0, -'.autodealers-online.com'.length);
  return !['admin', 'dealer', 'seller', 'advertiser', 'www'].includes(subdomain);
}

export function buildPublicVehicleDetailHref(opts: {
  vehicleId: string;
  tenantId: string;
  sellerId?: string;
  source?: 'seller' | 'dealer' | 'marketplace';
}): string {
  const tenantSegment = opts.tenantId.trim();
  const params = new URLSearchParams();
  if (opts.sellerId?.trim()) {
    params.set('sellerId', opts.sellerId.trim());
  }
  if (opts.source === 'dealer') {
    params.set('source', 'dealer');
  }
  const qs = params.toString();
  if (typeof window !== 'undefined' && isTenantSubdomainHost(window.location.hostname)) {
    return `/vehicle/${opts.vehicleId}${qs ? `?${qs}` : ''}`;
  }
  return `/${tenantSegment}/vehicle/${opts.vehicleId}${qs ? `?${qs}` : ''}`;
}

export function vehicleCatalogTenantId(
  vehicle: { tenantId?: string },
  fallbackTenantId: string
): string {
  return String(vehicle.tenantId || fallbackTenantId).trim();
}
