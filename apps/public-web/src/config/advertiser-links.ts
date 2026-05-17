/**
 * URL del panel de anunciantes (App Hosting). Override con NEXT_PUBLIC_ADVERTISER_APP_URL en .env
 */
const DEFAULT_ORIGIN = 'https://advertiser-app--autodealers-7f62e.us-central1.hosted.app';

export function getAdvertiserAppOrigin(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADVERTISER_APP_URL) {
    return process.env.NEXT_PUBLIC_ADVERTISER_APP_URL.replace(/\/$/, '');
  }
  return DEFAULT_ORIGIN;
}

/** Página de creación de anuncios (requiere sesión). */
export function getAdvertiserCreateAdUrl(): string {
  return `${getAdvertiserAppOrigin()}/dashboard/ads/create`;
}

/** Login con redirección al crear anuncio después de autenticarse. */
export function getAdvertiserLoginForCreateUrl(): string {
  const next = '/dashboard/ads/create';
  return `${getAdvertiserAppOrigin()}/login?next=${encodeURIComponent(next)}`;
}
