export const MAX_PUBLIC_TRUST_GALLERY_PHOTOS = 24;

export function normalizePublicTrustGalleryPhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_PUBLIC_TRUST_GALLERY_PHOTOS) break;
  }
  return out;
}

export function resolveTrustGalleryFromBody(body: Record<string, unknown>): string[] {
  return normalizePublicTrustGalleryPhotos(body.publicTrustGalleryPhotos ?? body.trustGalleryPhotos);
}
