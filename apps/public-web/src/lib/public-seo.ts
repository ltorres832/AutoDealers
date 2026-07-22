import {
  buildPublicWebUrl,
  buildTenantSiteUrl,
  resolvePublicWebUrl,
} from '@autodealers/shared/platform-urls';
import { isPlatformAppSubdomain, PLATFORM_APEX } from '@/lib/public-production-hosts';

/** Páginas públicas indexables (sin tokens ni paneles). */
export const PUBLIC_SITEMAP_STATIC_PATHS = [
  '/',
  '/search',
  '/compare',
  '/dealers',
  '/contacto',
  '/faq',
  '/terminos',
  '/privacidad',
  '/precios',
  '/caracteristicas',
  '/demo-vendedor',
  '/sobre-nosotros',
  '/advertise',
  '/publicar-gratis',
  '/register',
  '/registro',
  '/affiliate/register',
] as const;

const CORE_RESERVED_SLUGS = [
  'robots.txt',
  'sitemap.xml',
  'sitemap.xml.gz',
  'favicon.ico',
  'icon.png',
  'manifest.json',
  'apple-app-site-association',
  'demo-vendedor',
  'promo',
] as const;

/** Slugs que nunca deben tratarse como tenant en /[subdomain]. */
export const RESERVED_SUBDOMAIN_SLUGS = new Set<string>(CORE_RESERVED_SLUGS);

export function isReservedSubdomainSlug(slug: string): boolean {
  const normalized = (slug || '').trim().toLowerCase();
  if (!normalized) return true;
  if (RESERVED_SUBDOMAIN_SLUGS.has(normalized)) return true;
  if (normalized.includes('.')) return true;
  if (isPlatformAppSubdomain(normalized)) return true;
  return false;
}

export function getPublicSeoBaseUrl(): string {
  return resolvePublicWebUrl();
}

export function buildPublicSeoUrl(path: string): string {
  return buildPublicWebUrl(path);
}

export function shouldRedirectApexToWww(hostname: string): boolean {
  const host = (hostname || '').split(':')[0]?.toLowerCase() ?? '';
  return host === PLATFORM_APEX;
}

export function wwwHostname(): string {
  return `www.${PLATFORM_APEX}`;
}

export { buildTenantSiteUrl };
