export interface WhatsAppConfig {
    enabled: boolean;
    phoneNumberId: string;
    accessToken: string;
    verifyToken?: string;
    webhookUrl?: string;
    autoRespond: boolean;
    businessName?: string;
    businessDescription?: string;
    workingHours?: {
        enabled: boolean;
        timezone?: string;
        schedule?: {
            day: string;
            start: string;
            end: string;
        }[];
    };
    awayMessage?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Obtiene la configuración de WhatsApp de un tenant
 */
export declare function getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig | null>;
/**
 * Guarda la configuración de WhatsApp de un tenant
 */
export declare function saveWhatsAppConfig(tenantId: string, config: Partial<WhatsAppConfig>): Promise<void>;
/**
 * Obtiene el access token de WhatsApp de un tenant (desencriptado)
 */
export declare function getWhatsAppAccessToken(tenantId: string): Promise<string | null>;
/**
 * Obtiene el phone number ID de WhatsApp de un tenant
 */
export declare function getWhatsAppPhoneNumberId(tenantId: string): Promise<string | null>;
//# sourceMappingURL=whatsapp-config.d.ts.map