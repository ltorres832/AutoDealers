/**
 * Obtiene una credencial del sistema desde Firestore
 * Si no existe en Firestore, intenta obtenerla de process.env como fallback
 */
export declare function getSystemCredential(key: string): Promise<string | undefined>;
/**
 * Obtiene la API Key de OpenAI
 */
export declare function getOpenAIApiKey(): Promise<string | undefined>;
/**
 * Obtiene todas las credenciales del sistema
 */
export declare function getAllSystemCredentials(): Promise<Record<string, string>>;
/**
 * Obtiene la Secret Key de Stripe desde Firestore o variables de entorno
 */
export declare function getStripeSecretKey(): Promise<string | undefined>;
/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
export declare function getStripeWebhookSecret(): Promise<string | undefined>;
/**
 * Obtiene el Publishable Key de Stripe desde Firestore o variables de entorno
 */
export declare function getStripePublishableKey(): Promise<string | undefined>;
/**
 * Obtiene todas las credenciales de Stripe
 */
export declare function getStripeCredentials(): Promise<{
    secretKey?: string;
    webhookSecret?: string;
    publishableKey?: string;
}>;
/**
 * Obtiene las credenciales de Meta (Facebook/Instagram) desde Firestore o variables de entorno
 */
export declare function getMetaCredentials(): Promise<{
    appId?: string;
    appSecret?: string;
    verifyToken?: string;
}>;
/**
 * Obtiene las credenciales de WhatsApp desde Firestore o variables de entorno
 */
export declare function getWhatsAppCredentials(): Promise<{
    accessToken?: string;
    phoneNumberId?: string;
    webhookVerifyToken?: string;
}>;
/**
 * Obtiene las credenciales de Twilio desde Firestore o variables de entorno
 */
export declare function getTwilioCredentials(): Promise<{
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
}>;
/**
 * Obtiene las credenciales de Email (SendGrid/Resend) desde Firestore o variables de entorno
 */
export declare function getEmailCredentials(): Promise<{
    apiKey?: string;
    fromAddress?: string;
}>;
/**
 * Obtiene todas las credenciales del sistema desde Firestore
 * Útil para verificar qué credenciales están configuradas
 */
export declare function getAllCredentials(): Promise<{
    stripe?: {
        secretKey?: string;
        webhookSecret?: string;
        publishableKey?: string;
    };
    openai?: {
        apiKey?: string;
    };
    meta?: {
        appId?: string;
        appSecret?: string;
        verifyToken?: string;
    };
    whatsapp?: {
        accessToken?: string;
        phoneNumberId?: string;
        webhookVerifyToken?: string;
    };
    twilio?: {
        accountSid?: string;
        authToken?: string;
        phoneNumber?: string;
    };
    email?: {
        apiKey?: string;
        fromAddress?: string;
    };
}>;
/**
 * Obtiene las credenciales de Zoho Mail desde Firestore o variables de entorno
 */
export declare function getZohoMailCredentials(): Promise<{
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    domain?: string;
    organizationId?: string;
    smtpUser?: string;
    smtpPassword?: string;
}>;
/**
 * Obtiene las credenciales de proveedores de crédito desde Firestore
 */
export declare function getCreditProviderCredentials(): Promise<{
    experian?: {
        apiKey?: string;
        apiSecret?: string;
        enabled?: boolean;
    };
    equifax?: {
        apiKey?: string;
        apiSecret?: string;
        enabled?: boolean;
    };
    transunion?: {
        apiKey?: string;
        apiSecret?: string;
        enabled?: boolean;
    };
}>;
//# sourceMappingURL=credentials.d.ts.map