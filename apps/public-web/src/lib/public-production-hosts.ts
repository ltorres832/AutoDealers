/** Subdominios reservados para paneles de la plataforma (no son tenants). */
export const PLATFORM_APP_SUBDOMAINS = [
  'www',
  'admin',
  'dealers',
  'sellers',
  'ads',
  'app',
  'dealer',
  'seller',
  'advertiser',
  'api',
  'public-web',
  'public-web-app',
  'dealer-app',
  'seller-app',
  'admin-app',
  'advertiser-app',
] as const;

export const PLATFORM_APEX = 'autodealers-online.com';

/** URLs de producción por app (override con env en cada apphosting.yaml). */
export const PLATFORM_APP_URLS = {
  public: 'https://www.autodealers-online.com',
  admin: 'https://admin.autodealers-online.com',
  dealer: 'https://dealers.autodealers-online.com',
  seller: 'https://sellers.autodealers-online.com',
  advertiser: 'https://ads.autodealers-online.com',
} as const;

/** Dominio público de producción (www). */
export const PUBLIC_PRODUCTION_BASE_URL = PLATFORM_APP_URLS.public;

export function isPlatformAppSubdomain(subdomain: string): boolean {
  return (PLATFORM_APP_SUBDOMAINS as readonly string[]).includes(subdomain.toLowerCase());
}

export function isPlatformApexHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return host === PLATFORM_APEX || host.endsWith(`.${PLATFORM_APEX}`);
}


/** Hosts donde `/` puede mostrar la web del vendedor raíz (sin subdominio de tenant). */
export const PUBLIC_ROOT_HOSTS = new Set([
  'autodealers-7f62e.web.app',
  'autodealers-7f62e.firebaseapp.com',
  'www.autodealers-online.com',
  'autodealers-online.com',
]);

export function normalizeHostname(hostname: string): string {
  return (hostname || '').split(':')[0]?.toLowerCase() ?? '';
}

export function isPublicRootHost(hostname: string): boolean {
  return PUBLIC_ROOT_HOSTS.has(normalizeHostname(hostname));
}

export function resolvedPublicBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  return fromEnv || PUBLIC_PRODUCTION_BASE_URL;
}

/** Vendedor en la raíz del dominio público (NEXT_PUBLIC_DEFAULT_ROOT_SELLER_ID). */
export function getDefaultRootSellerId(): string | null {
  const id = process.env.NEXT_PUBLIC_DEFAULT_ROOT_SELLER_ID?.trim();
  return id || null;
}

/** Host raíz del marketplace (sin subdominio de tenant). */
export function isMarketplaceRootHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (isPublicRootHost(host)) return true;
  if (host === 'localhost') return true;
  if (
    host.includes('---') ||
    host.includes('amplifyapp') ||
    host.includes('us-central1.hosted.app')
  ) {
    return true;
  }
  const parts = host.split('.');
  return parts.length <= 2 && !host.includes('localhost');
}
