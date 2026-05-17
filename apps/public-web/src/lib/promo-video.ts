export type PromoVideoRender =
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string }
  | { kind: 'direct'; url: string };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const DIRECT_EXT = /\.(mp4|webm|ogg)(\?.*)?$/i;

function tryParseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

/**
 * Interpreta una URL pegada por el dealer/vendedor (YouTube, Vimeo o archivo de vídeo HTTPS).
 */
export function parsePromoVideoUrl(raw: string | undefined | null): PromoVideoRender | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (!url) return null;

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (id && /^[\w-]{6,}$/.test(id)) return { kind: 'youtube', id };
    return null;
  }

  if (YOUTUBE_HOSTS.has(host) || YOUTUBE_HOSTS.has(`www.${host}`)) {
    const v = url.searchParams.get('v');
    if (v && /^[\w-]{6,}$/.test(v)) return { kind: 'youtube', id: v };
    const shorts = url.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shorts?.[1]) return { kind: 'youtube', id: shorts[1] };
    const embed = url.pathname.match(/^\/embed\/([\w-]+)/);
    if (embed?.[1]) return { kind: 'youtube', id: embed[1] };
    return null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/\/(?:video\/)?(\d+)/);
    if (m?.[1]) return { kind: 'vimeo', id: m[1] };
    return null;
  }

  if (url.protocol === 'https:' && DIRECT_EXT.test(url.pathname)) {
    return { kind: 'direct', url: url.toString() };
  }

  return null;
}
