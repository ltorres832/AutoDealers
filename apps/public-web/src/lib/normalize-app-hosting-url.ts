/**
 * Firebase App Hosting usa hosts como `seller-app--PROJECT.REGION.hosted.app`.
 * A veces en "sitio web" se guarda `SUBDOMINIO.seller-app--...` creyendo que el
 * slug del dealer forma parte del DNS; eso no resuelve (NXDOMAIN).
 */
const APP_HOSTING_BACKENDS = [
  'seller-app',
  'dealer-app',
  'admin-app',
  'advertiser-app',
  'public-web-app',
] as const;

export function normalizeMisplacedFirebaseAppHostingUrl(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    let h = u.hostname.toLowerCase();
    for (const b of APP_HOSTING_BACKENDS) {
      const needle = `.${b}--`;
      const idx = h.indexOf(needle);
      if (idx > 0) {
        u.hostname = h.slice(idx + 1);
        u.hash = '';
        return u.href.replace(/\/$/, '');
      }
    }
    return withProto.replace(/\/$/, '');
  } catch {
    return s;
  }
}

/** URL absoluta para enlaces externos (añade https si falta). */
export function externalWebsiteHref(raw: string): string {
  const n = normalizeMisplacedFirebaseAppHostingUrl(raw);
  if (!n) return '#';
  return /^https?:\/\//i.test(n) ? n : `https://${n}`;
}
