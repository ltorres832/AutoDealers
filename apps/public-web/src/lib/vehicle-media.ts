import { getVehiclePhotos } from './vehicle-image';

export type VehicleMediaKind = 'photo' | 'video';

export type VehicleMediaItem = {
  kind: VehicleMediaKind;
  src: string;
};

export type VehicleMediaSource = {
  photos?: string[];
  images?: string[];
  videos?: string[];
  videoUrl?: string;
  video?: string;
};

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const src = raw.trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

export function getVehicleVideos(vehicle: VehicleMediaSource): string[] {
  const list: string[] = [];
  if (Array.isArray(vehicle.videos)) list.push(...vehicle.videos);
  if (typeof vehicle.videoUrl === 'string') list.push(vehicle.videoUrl);
  if (typeof vehicle.video === 'string') list.push(vehicle.video);
  return uniqueUrls(list.filter((item): item is string => typeof item === 'string'));
}

/** Photos first (hero), then videos — one strip for the catalog gallery. */
export function getVehicleMedia(vehicle: VehicleMediaSource): VehicleMediaItem[] {
  const videos = getVehicleVideos(vehicle).map((src) => ({ kind: 'video' as const, src }));
  const photos = getVehiclePhotos(vehicle).map((src) => ({ kind: 'photo' as const, src }));
  return [...photos, ...videos];
}

export function youtubeVideoId(src: string): string | null {
  const match = src.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export function vimeoVideoId(src: string): string | null {
  const match = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function videoEmbedSrc(src: string): string | null {
  const yt = youtubeVideoId(src);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = vimeoVideoId(src);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return null;
}
