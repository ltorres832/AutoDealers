import {
  buildTenantSiteUrl,
  formatTenantHostname,
  resolvePublicWebUrl,
  tenantHostSuffix,
} from '@autodealers/shared/platform-urls';

export { formatTenantHostname, buildTenantSiteUrl, tenantHostSuffix };

/** @deprecated use buildTenantSiteUrl */
export function buildSubdomainSiteUrl(subdomain: string): string {
  return buildTenantSiteUrl(subdomain);
}

export function publicWebBaseUrl(): string {
  return resolvePublicWebUrl();
}

/** Catálogo público del vendedor: /seller/{userId} en el sitio www. */
export function buildSellerCatalogUrl(sellerId: string): string {
  const id = (sellerId || '').trim();
  if (!id) return '';
  return `${resolvePublicWebUrl()}/seller/${id}`;
}

/**
 * Enlace principal para compartir con clientes.
 * Prioriza mini-sitio por subdominio si existe URL guardada; si no, catálogo /seller/{uid}.
 */
export function resolvePrimaryPublicSiteUrl(opts: {
  sellerId?: string;
  publicCatalogUrl?: string;
  subdomain?: string;
}): string {
  if (opts.subdomain?.trim()) {
    return buildTenantSiteUrl(opts.subdomain);
  }
  if (opts.publicCatalogUrl?.trim()) return opts.publicCatalogUrl.trim();
  return buildSellerCatalogUrl(opts.sellerId || '');
}
