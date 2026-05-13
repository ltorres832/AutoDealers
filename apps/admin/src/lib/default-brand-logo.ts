/** Misma ruta que en public-web `public/brand/` — mantener alineado con el sitio público. */
export const DEFAULT_BRAND_LOGO_PATH = '/brand/autodealers-online-logo.png';

export function normalizePublicSiteLogoField<T extends { logo?: unknown }>(siteInfo: T): T {
  const logo = String(siteInfo.logo ?? '').trim();
  if (!logo || logo.toUpperCase() === 'AD') {
    return { ...siteInfo, logo: DEFAULT_BRAND_LOGO_PATH };
  }
  return siteInfo;
}
