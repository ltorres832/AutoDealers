/** Dominio público de producción (www). */
export const PUBLIC_PRODUCTION_BASE_URL = 'https://www.autodealers-online.com';

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
