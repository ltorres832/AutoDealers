/**
 * URL absoluta para imágenes y favicons cuando el HTML/metadata usan rutas relativas
 * (evita roturas en App Hosting / proxies si falta metadataBase).
 */
export function resolvePublicMediaUrl(
  url: string | undefined | null,
  opts?: { origin?: string }
): string | undefined {
  if (url == null) return undefined;
  const u = String(url).trim();
  if (!u) return undefined;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) {
    const origin =
      opts?.origin ||
      (typeof window !== 'undefined' ? window.location.origin : '') ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
        ? String(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '')
        : '');
    if (!origin) return u;
    return `${origin}${u}`;
  }
  return u;
}
