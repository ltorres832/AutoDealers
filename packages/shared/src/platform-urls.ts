/** Dominio raíz de producción (DNS real en Firebase App Hosting). */
export const PLATFORM_APEX = 'autodealers-online.com';

/** URLs HTTPS de cada app en producción. */
export const PLATFORM_URLS = {
  public: `https://www.${PLATFORM_APEX}`,
  publicApex: `https://${PLATFORM_APEX}`,
  admin: `https://admin.${PLATFORM_APEX}`,
  dealer: `https://dealer.${PLATFORM_APEX}`,
  seller: `https://seller.${PLATFORM_APEX}`,
  advertiser: `https://advertiser.${PLATFORM_APEX}`,
  business: `https://business.${PLATFORM_APEX}`,
} as const;

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Primer valor no vacío de la lista, o fallback final. */
export function pickPlatformUrl(
  fallback: string,
  ...candidates: (string | undefined | null)[]
): string {
  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed) return stripTrailingSlash(trimmed);
  }
  return stripTrailingSlash(fallback);
}

export function resolvePublicWebUrl(): string {
  return pickPlatformUrl(
    PLATFORM_URLS.public,
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
}

export function resolveAdminUrl(): string {
  return pickPlatformUrl(
    PLATFORM_URLS.admin,
    process.env.ADMIN_APP_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
    process.env.NEXT_PUBLIC_ADMIN_APP_URL,
    process.env.NEXTAUTH_URL
  );
}

export function resolveDealerUrl(): string {
  return pickPlatformUrl(
    PLATFORM_URLS.dealer,
    process.env.NEXT_PUBLIC_DEALER_APP_URL,
    process.env.NEXT_PUBLIC_DEALER_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
}

export function resolveSellerUrl(): string {
  return pickPlatformUrl(
    PLATFORM_URLS.seller,
    process.env.NEXT_PUBLIC_SELLER_APP_URL,
    process.env.NEXT_PUBLIC_SELLER_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
}

export function resolveAdvertiserUrl(): string {
  return pickPlatformUrl(
    PLATFORM_URLS.advertiser,
    process.env.NEXT_PUBLIC_ADVERTISER_APP_URL,
    process.env.NEXT_PUBLIC_ADVERTISER_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
}

export function resolveBusinessUrl(): string {
  return pickPlatformUrl(
    PLATFORM_URLS.business,
    process.env.NEXT_PUBLIC_BUSINESS_APP_URL,
    process.env.NEXT_PUBLIC_BUSINESS_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
}

/** Apex para mini-sitios de tenants (ej. pedroortiz.autodealers-online.com). */
export function resolvePlatformApex(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.replace(/^\./, '').trim();
  return fromEnv || PLATFORM_APEX;
}

/** Sufijo UI: `.autodealers-online.com` */
export function tenantHostSuffix(): string {
  return `.${resolvePlatformApex()}`;
}

export function formatTenantHostname(subdomain: string): string {
  const slug = (subdomain || '').trim().toLowerCase();
  if (!slug) return '';
  return `${slug}.${resolvePlatformApex()}`;
}

export function buildTenantSiteUrl(subdomain: string): string {
  const host = formatTenantHostname(subdomain);
  return host ? `https://${host}` : '';
}

/** Base URL del sitio público (www). Nunca usar el origin del panel dealer/seller. */
export function getPublicWebBaseUrl(): string {
  return resolvePublicWebUrl();
}

export function buildPublicWebUrl(path: string): string {
  const base = getPublicWebBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function buildReviewInvitePublicUrl(token: string): string {
  return buildPublicWebUrl(`/evaluar/${encodeURIComponent(token)}`);
}
