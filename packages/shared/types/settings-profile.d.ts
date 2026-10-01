/** Utilidades compartidas para guardar perfil / configuración pública. */
export declare function safeTrim(value: unknown): string;
export declare function normalizeLoginEmail(email: string): string;
export declare function sanitizeSocialMedia(raw: unknown): Record<string, string>;
/** Convierte horarios legacy (objeto Firestore) a texto para formularios. */
export declare function normalizeBusinessHoursForForm(value: unknown): string;
export declare function businessHoursForStorage(value: unknown): string;
/** Texto público de perfil (bio corta + descripción), con fallback al tenant. */
export declare function resolvePublicProfileText(input: {
    bio?: unknown;
    description?: unknown;
    tenantDescription?: unknown;
    websiteAboutContent?: unknown;
}): {
    bio: string;
    description: string;
    aboutText: string;
};
