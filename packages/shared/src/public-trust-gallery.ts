export const MAX_PUBLIC_TRUST_GALLERY_PHOTOS = 24;

export type PublicTrustGalleryItem = {
  url: string;
  caption?: string;
};

export function normalizePublicTrustGalleryItems(raw: unknown): PublicTrustGalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PublicTrustGalleryItem[] = [];

  for (const item of raw) {
    let url = '';
    let caption = '';

    if (typeof item === 'string') {
      url = item.trim();
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      url = String(obj.url ?? obj.photo ?? obj.src ?? '').trim();
      caption = String(obj.caption ?? obj.description ?? obj.text ?? '').trim();
    }

    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(caption ? { url, caption } : { url });
    if (out.length >= MAX_PUBLIC_TRUST_GALLERY_PHOTOS) break;
  }

  return out;
}

/** Compatibilidad: solo URLs (APIs y código legacy). */
export function normalizePublicTrustGalleryPhotos(raw: unknown): string[] {
  return normalizePublicTrustGalleryItems(raw).map((item) => item.url);
}

export function resolveTrustGalleryFromBody(body: Record<string, unknown>): PublicTrustGalleryItem[] {
  return normalizePublicTrustGalleryItems(body.publicTrustGalleryPhotos ?? body.trustGalleryPhotos);
}
