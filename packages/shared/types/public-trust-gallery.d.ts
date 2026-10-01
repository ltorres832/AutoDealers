export declare const MAX_PUBLIC_TRUST_GALLERY_PHOTOS = 24;
export type PublicTrustGalleryItem = {
    url: string;
    caption?: string;
};
export declare function normalizePublicTrustGalleryItems(raw: unknown): PublicTrustGalleryItem[];
/** Compatibilidad: solo URLs (APIs y código legacy). */
export declare function normalizePublicTrustGalleryPhotos(raw: unknown): string[];
export declare function resolveTrustGalleryFromBody(body: Record<string, unknown>): PublicTrustGalleryItem[];
