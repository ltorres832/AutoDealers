export type AdCreativeAnimation = 'none' | 'fade' | 'slide' | 'kenburns';

export const MAX_AD_CREATIVE_IMAGES = 8;

export const AD_CREATIVE_ANIMATIONS: AdCreativeAnimation[] = [
  'fade',
  'slide',
  'kenburns',
  'none',
];

export const AD_CREATIVE_ANIMATION_LABELS: Record<AdCreativeAnimation, string> = {
  fade: 'Fundido (fade)',
  slide: 'Deslizamiento',
  kenburns: 'Ken Burns (zoom suave)',
  none: 'Sin movimiento',
};

export function normalizeAdAnimation(value: unknown): AdCreativeAnimation {
  if (value === 'fade' || value === 'slide' || value === 'kenburns' || value === 'none') {
    return value;
  }
  return 'fade';
}

export function getAdCreativeVideo(item: {
  videoUrl?: string | null;
  video?: string | null;
  videos?: unknown;
  mediaType?: string | null;
}): string {
  const single = typeof item.videoUrl === 'string' ? item.videoUrl.trim() : '';
  if (single) return single;
  const alias = typeof item.video === 'string' ? item.video.trim() : '';
  if (alias) return alias;
  const fromArray = Array.isArray(item.videos)
    ? item.videos.find((url): url is string => typeof url === 'string' && url.trim().length > 0)
    : undefined;
  return fromArray ? fromArray.trim() : '';
}

export function hasAdCreativeMedia(item: {
  imageUrl?: string | null;
  image?: string | null;
  images?: unknown;
  videoUrl?: string | null;
  video?: string | null;
  videos?: unknown;
  mediaType?: string | null;
}): boolean {
  return getAdCreativeImages(item).length > 0 || Boolean(getAdCreativeVideo(item));
}

export function getAdCreativeImages(item: {
  imageUrl?: string | null;
  image?: string | null;
  images?: unknown;
}): string[] {
  const fromArray = Array.isArray(item.images)
    ? item.images.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    : [];
  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray.map((url) => url.trim()))).slice(0, MAX_AD_CREATIVE_IMAGES);
  }
  const single = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
  if (single) return [single];
  const alias = typeof item.image === 'string' ? item.image.trim() : '';
  return alias ? [alias] : [];
}

/** Primera imagen o el video, para thumbs de listados (nunca vacío si hay media). */
export function resolveAdCreativePreviewSrc(item: {
  imageUrl?: string | null;
  image?: string | null;
  images?: unknown;
  videoUrl?: string | null;
  video?: string | null;
  videos?: unknown;
  mediaType?: string | null;
}): { kind: 'image' | 'video' | 'none'; src: string } {
  const images = getAdCreativeImages(item);
  if (images[0]) return { kind: 'image', src: images[0] };
  const video = getAdCreativeVideo(item);
  if (video) return { kind: 'video', src: video };
  return { kind: 'none', src: '' };
}

export function resolveAdCreativePayload(input: {
  imageUrl?: unknown;
  images?: unknown;
  animation?: unknown;
}): { imageUrl: string; images: string[]; animation: AdCreativeAnimation } {
  const images = getAdCreativeImages({
    imageUrl: typeof input.imageUrl === 'string' ? input.imageUrl : '',
    images: input.images,
  });
  return {
    imageUrl: images[0] || '',
    images,
    animation: normalizeAdAnimation(input.animation),
  };
}
