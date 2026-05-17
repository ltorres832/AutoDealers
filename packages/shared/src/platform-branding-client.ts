/**
 * Marca global de plataforma (Firestore `admin_settings/branding`).
 * Usado en cliente (favicon, logos) y en rutas API que leen el mismo documento.
 */

export const DEFAULT_PLATFORM_BRAND_ASSET = '/brand/ad-platform-logo.png';

export const PLATFORM_BRANDING_COLLECTION = 'admin_settings';
export const PLATFORM_BRANDING_DOC_ID = 'branding';

export type PlatformBrandingParsed = {
  logo: string;
  favicon: string;
  companyName: string;
  adminName: string;
  adminPhoto: string;
  logoVersion: number;
};

function millisFromUpdatedAt(updatedAt: unknown): number {
  if (
    updatedAt &&
    typeof (updatedAt as { toMillis?: () => number }).toMillis === 'function'
  ) {
    return (updatedAt as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/** Normaliza datos del documento `branding` (cliente o Admin SDK). */
export function parsePlatformBrandingFirestoreData(
  data: Record<string, unknown> | undefined,
  updatedAt: unknown
): PlatformBrandingParsed {
  const logoVersion = millisFromUpdatedAt(updatedAt ?? data?.updatedAt);
  const logo =
    typeof data?.logo === 'string' && data.logo.trim()
      ? data.logo.trim()
      : DEFAULT_PLATFORM_BRAND_ASSET;
  const favicon =
    typeof data?.favicon === 'string' && data.favicon.trim()
      ? data.favicon.trim()
      : DEFAULT_PLATFORM_BRAND_ASSET;
  const companyName =
    typeof data?.companyName === 'string' && data.companyName.trim()
      ? data.companyName.trim()
      : 'AutoDealers';
  const adminName =
    typeof data?.adminName === 'string' && data.adminName.trim()
      ? data.adminName.trim()
      : 'Administrador';
  const adminPhoto =
    typeof data?.adminPhoto === 'string' && data.adminPhoto.trim()
      ? data.adminPhoto.trim()
      : '';

  return { logo, favicon, companyName, adminName, adminPhoto, logoVersion };
}

function faviconMime(url: string): string {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

/** Quita favicons dinámicos previos para evitar duplicados y mezclas de tamaño. */
function removeBrandingFaviconLinks() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('link[data-ad-branding-icon="1"]').forEach((el) => el.remove());
}

/**
 * Aplica favicon y apple-touch-icon con tamaños explícitos (mejor nitidez en pestañas que un solo PNG grande).
 */
export function applyPlatformFaviconToDocument(faviconUrl: string, logoVersion: number) {
  if (typeof document === 'undefined') return;
  const v = logoVersion > 0 ? logoVersion : Date.now();
  const href = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${v}`;
  const type = faviconMime(faviconUrl);

  removeBrandingFaviconLinks();

  for (const sizes of ['32x32', '16x16'] as const) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = type;
    link.setAttribute('sizes', sizes);
    link.href = href;
    link.setAttribute('data-ad-branding-icon', '1');
    document.head.appendChild(link);
  }

  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.type = type;
  apple.setAttribute('sizes', '180x180');
  apple.href = href;
  apple.setAttribute('data-ad-branding-icon', '1');
  document.head.appendChild(apple);
}
