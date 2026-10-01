/**
 * Marca global de plataforma (Firestore `admin_settings/branding`).
 * Usado en cliente (favicon, logos) y en rutas API que leen el mismo documento.
 */
export declare const DEFAULT_PLATFORM_BRAND_ASSET = "/brand/ad-platform-logo.png";
export declare const PLATFORM_BRANDING_COLLECTION = "admin_settings";
export declare const PLATFORM_BRANDING_DOC_ID = "branding";
export type PlatformBrandingParsed = {
    logo: string;
    favicon: string;
    companyName: string;
    adminName: string;
    adminPhoto: string;
    logoVersion: number;
};
/** Normaliza datos del documento `branding` (cliente o Admin SDK). */
export declare function parsePlatformBrandingFirestoreData(data: Record<string, unknown> | undefined, updatedAt: unknown): PlatformBrandingParsed;
/**
 * Aplica favicon y apple-touch-icon con tamaños explícitos (mejor nitidez en pestañas que un solo PNG grande).
 */
export declare function applyPlatformFaviconToDocument(faviconUrl: string, logoVersion: number): void;
