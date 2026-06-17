/**
 * URL del panel de anunciantes (App Hosting). Override con NEXT_PUBLIC_ADVERTISER_APP_URL en .env
 */
const DEFAULT_ORIGIN = 'https://ads.autodealers-online.com';

export function getAdvertiserAppOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_ADVERTISER_APP_URL ||
    process.env.NEXT_PUBLIC_ADVERTISER_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
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

export function getAdvertiserRegisterUrl(): string {
  return `${getAdvertiserAppOrigin()}/register`;
}

export function getAdvertiserLoginUrl(): string {
  return `${getAdvertiserAppOrigin()}/login`;
}
