/**
 * Dominios de producción — una app por subdominio.
 * Usado por scripts/print-firebase-auth-domains.mjs y docs/MULTI_APP_DOMAINS.md
 */
export const PLATFORM_APEX = 'autodealers-online.com';

/** Subdominios reservados para paneles (no pueden registrarse como tenant). */
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
  'business',
  'api',
  'public-web',
  'public-web-app',
  'dealer-app',
  'seller-app',
  'admin-app',
  'advertiser-app',
  'business-app',
];

/** Backend Firebase App Hosting → host público (DNS real en autodealers-online.com) */
export const APP_HOSTING_BACKENDS = {
  'public-web-app': `www.${PLATFORM_APEX}`,
  'admin-app': `admin.${PLATFORM_APEX}`,
  'dealer-app': `dealer.${PLATFORM_APEX}`,
  'seller-app': `seller.${PLATFORM_APEX}`,
  'advertiser-app': `advertiser.${PLATFORM_APEX}`,
  'business-app': `business.${PLATFORM_APEX}`,
};

/** Subdominios legacy (plural) — incluir en Auth por si quedaron bookmarks viejos */
export const AUTH_DOMAIN_ALIASES = [
  `dealers.${PLATFORM_APEX}`,
  `sellers.${PLATFORM_APEX}`,
  `ads.${PLATFORM_APEX}`,
];

export const PLATFORM_URLS = {
  public: `https://www.${PLATFORM_APEX}`,
  publicApex: `https://${PLATFORM_APEX}`,
  admin: `https://admin.${PLATFORM_APEX}`,
  dealer: `https://dealer.${PLATFORM_APEX}`,
  seller: `https://seller.${PLATFORM_APEX}`,
  advertiser: `https://advertiser.${PLATFORM_APEX}`,
  business: `https://business.${PLATFORM_APEX}`,
};

/** Todos los hosts custom para Firebase Auth / API key referrers */
export function listCustomAuthHosts() {
  const hosts = new Set([
    PLATFORM_APEX,
    ...Object.values(APP_HOSTING_BACKENDS),
    ...AUTH_DOMAIN_ALIASES,
  ]);
  return [...hosts].sort();
}

/** Referrers HTTPS para Google Cloud API key */
export function listCustomAuthReferrers() {
  return listCustomAuthHosts().map((h) => `https://${h}/*`);
}
