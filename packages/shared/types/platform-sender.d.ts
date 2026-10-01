/** Marca visible en emails, SMS y WhatsApp transaccionales. */
export declare const PLATFORM_NAME = "AutoDealersOnline";
export declare const DEFAULT_PLATFORM_EMAIL = "noreply@autodealers-online.com";
export declare function parseEmailAddress(raw: string): {
    email: string;
    name?: string;
};
/** Formato remitente: AutoDealersOnline <email@dominio> */
export declare function formatPlatformEmailFrom(raw?: string | null): string;
export declare function defaultPlatformEmailSubject(topic?: string): string;
export declare function platformMessageSignature(): string;
/** Corrige textos legacy "AutoDealers" / "autodealers" dentro del cuerpo del mensaje. */
export declare function normalizePlatformMessageText(text: string): string;
