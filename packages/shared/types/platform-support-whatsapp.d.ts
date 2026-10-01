export type PlatformSupportWhatsAppOption = {
    id: string;
    label: string;
    message: string;
};
export declare const PLATFORM_SUPPORT_WHATSAPP_OPTIONS: PlatformSupportWhatsAppOption[];
/** Primera opción (compatibilidad con enlaces simples). */
export declare const PLATFORM_SUPPORT_WHATSAPP_MESSAGE: string;
export declare function isPlaceholderWhatsAppNumber(value: string): boolean;
export declare function buildWhatsAppSupportUrl(whatsapp: string, message: string): string;
export declare function buildPlatformSupportWhatsAppOptions(whatsapp: string): {
    id: string;
    label: string;
    message: string;
    url: string;
}[];
