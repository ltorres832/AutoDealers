/**
 * URL del panel de anunciantes (App Hosting). Override con NEXT_PUBLIC_ADVERTISER_APP_URL en .env
 */
const DEFAULT_ORIGIN = 'https://advertiser.autodealers-online.com';

export function getAdvertiserAppOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_ADVERTISER_APP_URL ||
    process.env.NEXT_PUBLIC_ADVERTISER_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return DEFAULT_ORIGIN;
}

export function getAdvertiserCreateAdPath(placement?: string): string {
  return placement
    ? `/dashboard/ads/create?placement=${encodeURIComponent(placement)}`
    : '/dashboard/ads/create';
}

/** Página de creación de anuncios (requiere sesión). */
export function getAdvertiserCreateAdUrl(placement?: string): string {
  return `${getAdvertiserAppOrigin()}${getAdvertiserCreateAdPath(placement)}`;
}

/** Login con redirección al crear anuncio después de autenticarse. */
export function getAdvertiserLoginForCreateUrl(placement?: string): string {
  const next = getAdvertiserCreateAdPath(placement);
  return `${getAdvertiserAppOrigin()}/login?next=${encodeURIComponent(next)}`;
}

/** Registro de anunciante; al terminar (o si ya hay sesión) va a crear anuncio. */
export function getAdvertiserRegisterForCreateUrl(placement?: string): string {
  const next = getAdvertiserCreateAdPath(placement);
  return `${getAdvertiserAppOrigin()}/register?next=${encodeURIComponent(next)}`;
}

export function getAdvertiserRegisterUrl(): string {
  return `${getAdvertiserAppOrigin()}/register`;
}

export function getAdvertiserLoginUrl(): string {
  return `${getAdvertiserAppOrigin()}/login`;
}
