/** Fondo del hero público (catálogo vendedor / mini-sitio dealer). */
export type WebsiteHeroMediaMode = 'gradient' | 'image' | 'video';

export type WebsiteHeroMediaFields = {
  mediaMode: WebsiteHeroMediaMode;
  backgroundImage?: string;
  backgroundVideoUrl?: string;
  showText?: boolean; // Controla si se muestra el texto cuando hay imagen/video
};

const VALID_MODES = new Set<WebsiteHeroMediaMode>(['gradient', 'image', 'video']);

export function normalizeHeroMediaMode(raw: unknown): WebsiteHeroMediaMode {
  if (typeof raw === 'string' && VALID_MODES.has(raw as WebsiteHeroMediaMode)) {
    return raw as WebsiteHeroMediaMode;
  }
  return 'gradient';
}

export function normalizeHeroMediaUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t || undefined;
}

/** Normaliza campos de media del hero (idempotente). */
export function normalizeWebsiteHeroMedia(
  hero: Record<string, unknown> | null | undefined
): WebsiteHeroMediaFields {
  const h = hero && typeof hero === 'object' ? hero : {};
  const backgroundImage = normalizeHeroMediaUrl(h.backgroundImage);
  const backgroundVideoUrl = normalizeHeroMediaUrl(
    h.backgroundVideoUrl ?? h.heroVideoUrl
  );
  let mediaMode = normalizeHeroMediaMode(h.mediaMode);

  // Inferencia suave si hay media guardada sin mediaMode (datos viejos).
  if (h.mediaMode == null) {
    if (backgroundVideoUrl) mediaMode = 'video';
    else if (backgroundImage) mediaMode = 'image';
  }

  // showText: por defecto true si no está especificado
  const showText = h.showText === false ? false : true;

  return {
    mediaMode,
    backgroundImage,
    backgroundVideoUrl,
    showText,
  };
}

/** Aplica mediaMode + URLs sobre un objeto hero mutable. */
export function applyWebsiteHeroMediaToHero(
  hero: Record<string, unknown>
): Record<string, unknown> {
  const media = normalizeWebsiteHeroMedia(hero);
  hero.mediaMode = media.mediaMode;
  if (media.backgroundImage) hero.backgroundImage = media.backgroundImage;
  else delete hero.backgroundImage;
  if (media.backgroundVideoUrl) hero.backgroundVideoUrl = media.backgroundVideoUrl;
  else delete hero.backgroundVideoUrl;
  hero.showText = media.showText;
  return hero;
}
