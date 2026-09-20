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
  '/plataforma',
  '/demo-vendedor',
  '/demo-dealer',
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
  'demo-dealer',
  'plataforma',
  'promo',
  'sales',
  'login',
  'register',
  'registro',
  'search',
  'compare',
  'dealers',
  'dealer',
  'seller',
  'home-seller',
  'contacto',
  'faq',
  'terminos',
  'privacidad',
  'precios',
  'caracteristicas',
  'sobre-nosotros',
  'advertise',
  'ads-preview',
  'publicar-gratis',
  'anuncio',
  'category',
  'contracts',
  'fi',
  'upload-documents',
  'review',
  'survey',
  'dashboard',
  'partners',
  'affiliate',
  'setup-firebase',
  'api',
  'brand',
  'static',
] as const;

/** Slugs que nunca deben tratarse como tenant en /[subdomain]. */
export const RESERVED_SUBDOMAIN_SLUGS = new Set<string>([
  ...CORE_RESERVED_SLUGS,
  ...PUBLIC_SITEMAP_STATIC_PATHS.map((path) => path.split('/').filter(Boolean)[0]).filter(
    (seg): seg is string => Boolean(seg)
  ),
]);

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
