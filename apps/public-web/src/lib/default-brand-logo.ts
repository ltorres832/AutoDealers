/** Logo gráfico oficial en `public/brand/` (fondo transparente). */
export const DEFAULT_BRAND_LOGO_PATH = '/brand/autodealers-online-logo.png';

/** Si en Firestore quedó el placeholder en texto, usar el PNG del repo. */
export function normalizePublicSiteLogoField<T extends { logo?: unknown }>(siteInfo: T): T {
  const logo = String(siteInfo.logo ?? '').trim();
  if (!logo || logo.toUpperCase() === 'AD') {
    return { ...siteInfo, logo: DEFAULT_BRAND_LOGO_PATH };
  }
  return siteInfo;
}
