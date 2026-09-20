/** Pixel principal: browser + Conversions API (META_CAPI_ACCESS_TOKEN). */
export const META_PIXEL_ID = '2027543675348875';

/** Segundo pixel oficial: solo browser (sin token CAPI). */
export const META_PIXEL_ID_SECONDARY = '517922905706481';

/** Todos los pixels del sitio. fbevents.js se carga una vez; fbq('init') por cada ID. */
export const META_PIXEL_IDS = [META_PIXEL_ID, META_PIXEL_ID_SECONDARY] as const;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    __metaPixelEventId?: string;
  }
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      const value = rest.join('=').trim();
      return value || undefined;
    }
  }
  return undefined;
}

function sendMetaCapi(event: string, eventId: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({
    event,
    eventId,
    eventSourceUrl: window.location.href,
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc'),
    customData: params || undefined,
  });
  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/meta/capi', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {
    /* fallback */
  }
  fetch('/api/meta/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/** CAPI sin segundo PageView del píxel (el inicial ya lo dispara el código en <head>). */
export function sendMetaCapiOnly(event: string, eventId: string, params?: Record<string, unknown>) {
  sendMetaCapi(event, eventId, params);
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>, eventId?: string) {
  const id = eventId || newEventId();
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    if (params) window.fbq('track', event, params, { eventID: id });
    else window.fbq('track', event, {}, { eventID: id });
  }
  sendMetaCapi(event, id, params);
}

/** Evita doble disparo en recargas de la página de éxito. */
export function trackMetaEventOnce(key: string, event: string, params?: Record<string, unknown>) {
  try {
    const storageKey = `meta_px_${key}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch {
    /* private mode */
  }
  trackMetaEvent(event, params);
}
