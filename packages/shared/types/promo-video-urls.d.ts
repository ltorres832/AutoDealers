/** Máximo de videos promocionales en catálogo público (vendedor o dealer). */
export declare const MAX_PUBLIC_PROMO_VIDEOS = 12;
/**
 * Normaliza URLs de video desde array, string único o campo legacy.
 */
export declare function normalizePromoVideoUrls(urls: unknown, legacySingle?: unknown): string[];
export declare function resolvePromoVideoUrlsFromBody(body: Record<string, unknown>): string[];
/** Campos Firestore para vendedor (users). */
export declare function sellerPromoVideoFields(urls: string[]): {
    publicPromoVideoUrls: string[];
    publicPromoVideoUrl: string;
};
/** Campos hero en websiteSettings del dealer. */
export declare function heroPromoVideoFields(urls: string[]): {
    promoVideoUrls: string[];
    promoVideoUrl: string;
};
