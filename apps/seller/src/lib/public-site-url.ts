const PUBLIC_WEB_BASE =
  process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '') ||
  'https://autodealers-7f62e.web.app';

const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.replace(/^\./, '') || 'autodealers.com';

function normalizeExternalUrl(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  return withProto.replace(/\/$/, '');
}

/** Catálogo público del vendedor: /seller/{userId} en el sitio público. */
export function buildSellerCatalogUrl(sellerId: string): string {
  const id = (sellerId || '').trim();
  if (!id) return '';
  return `${PUBLIC_WEB_BASE}/seller/${id}`;
}

/** Mini-sitio por subdominio (sitio del tenant, distinto del catálogo /seller/…). */
export function buildSubdomainSiteUrl(subdomain: string): string {
  const slug = (subdomain || '').trim().toLowerCase();
  if (!slug) return '';
  return `https://${slug}.${PLATFORM_DOMAIN}`;
}

export function publicWebBaseUrl(): string {
  return PUBLIC_WEB_BASE;
}

/**
 * Enlace principal para compartir con clientes = catálogo /seller/{uid}.
 * Ej: https://autodealers-7f62e.web.app/seller/BRaL9edMRfNhEXNsMou0l7oCHFI2
 */
export function resolvePrimaryPublicSiteUrl(opts: {
  sellerId?: string;
  publicCatalogUrl?: string;
}): string {
  if (opts.publicCatalogUrl?.trim()) return opts.publicCatalogUrl.trim();
  return buildSellerCatalogUrl(opts.sellerId || '');
}
