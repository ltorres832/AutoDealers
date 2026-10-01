/** Fondo del hero público (catálogo vendedor / mini-sitio dealer). */
export type WebsiteHeroMediaMode = 'gradient' | 'image' | 'video';
export type WebsiteHeroMediaFields = {
    mediaMode: WebsiteHeroMediaMode;
    backgroundImage?: string;
    backgroundVideoUrl?: string;
    showText?: boolean;
};
export declare function normalizeHeroMediaMode(raw: unknown): WebsiteHeroMediaMode;
export declare function normalizeHeroMediaUrl(raw: unknown): string | undefined;
/** Normaliza campos de media del hero (idempotente). */
export declare function normalizeWebsiteHeroMedia(hero: Record<string, unknown> | null | undefined): WebsiteHeroMediaFields;
/** Aplica mediaMode + URLs sobre un objeto hero mutable. */
export declare function applyWebsiteHeroMediaToHero(hero: Record<string, unknown>): Record<string, unknown>;
