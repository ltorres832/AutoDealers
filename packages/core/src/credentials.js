"use strict";
// Gestión de credenciales del sistema desde Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemCredential = getSystemCredential;
exports.getOpenAIApiKey = getOpenAIApiKey;
exports.getAllSystemCredentials = getAllSystemCredentials;
exports.getStripeSecretKey = getStripeSecretKey;
exports.getStripeWebhookSecret = getStripeWebhookSecret;
exports.getStripeAdvertiserWebhookSecret = getStripeAdvertiserWebhookSecret;
exports.getStripePublishableKey = getStripePublishableKey;
exports.getStripeCredentials = getStripeCredentials;
exports.getMetaCredentials = getMetaCredentials;
exports.getWhatsAppCredentials = getWhatsAppCredentials;
exports.getTwilioCredentials = getTwilioCredentials;
exports.getEmailCredentials = getEmailCredentials;
exports.getAllCredentials = getAllCredentials;
exports.getZohoMailCredentials = getZohoMailCredentials;
exports.getCreditProviderCredentials = getCreditProviderCredentials;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const db = (0, shared_1.getFirestore)();
/**
 * Obtiene una credencial del sistema desde Firestore
 * Si no existe en Firestore, intenta obtenerla de process.env como fallback
 */
async function getSystemCredential(key) {
    try {
        const credentialsDoc = await getDb().collection('system_settings').doc('credentials').get();
        if (credentialsDoc.exists) {
            const data = credentialsDoc.data();
            if (data && data[key]) {
                return data[key];
            }
        }
    }
    catch (error) {
        console.error(`Error fetching credential ${key} from Firestore:`, error);
    }
    // Fallback a variables de entorno
    return process.env[key] || process.env[key.toUpperCase()];
}
/**
 * Obtiene la API Key de OpenAI
 */
async function getOpenAIApiKey() {
    return await getSystemCredential('openaiApiKey') || process.env.OPENAI_API_KEY;
}
/**
 * Obtiene todas las credenciales del sistema
 */
async function getAllSystemCredentials() {
    try {
        const credentialsDoc = await getDb().collection('system_settings').doc('credentials').get();
        if (credentialsDoc.exists) {
            const data = credentialsDoc.data() || {};
            return data;
        }
    }
    catch (error) {
        console.error('Error fetching credentials from Firestore:', error);
    }
    // Devolver objeto vacío si no hay credenciales en Firestore
    return {};
}
/**
 * Obtiene la Secret Key de Stripe desde Firestore o variables de entorno
 */
async function getStripeSecretKey() {
    const key = await getSystemCredential('stripeSecretKey');
    return key || process.env.STRIPE_SECRET_KEY;
}
/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
async function getStripeWebhookSecret() {
    const key = await getSystemCredential('stripeWebhookSecret');
    return key || process.env.STRIPE_WEBHOOK_SECRET;
}
/**
 * Webhook secret para la app Advertiser (segunda URL en Stripe Dashboard).
 * Orden: Firestore `stripeAdvertiserWebhookSecret` → env `STRIPE_ADVERTISER_WEBHOOK_SECRET`
 * → mismo valor que {@link getStripeWebhookSecret} (comportamiento histórico si no configuras nada aparte).
 */
async function getStripeAdvertiserWebhookSecret() {
    const fromDoc = await getSystemCredential('stripeAdvertiserWebhookSecret');
    if (fromDoc != null && String(fromDoc).trim() !== '') {
        return String(fromDoc).trim();
    }
    const envAdv = process.env.STRIPE_ADVERTISER_WEBHOOK_SECRET;
    if (envAdv != null && String(envAdv).trim() !== '') {
        return String(envAdv).trim();
    }
    return await getStripeWebhookSecret();
}
/**
 * Obtiene el Publishable Key de Stripe desde Firestore o variables de entorno
 */
async function getStripePublishableKey() {
    const key = await getSystemCredential('stripePublishableKey');
    return key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
/**
 * Obtiene todas las credenciales de Stripe
 */
async function getStripeCredentials() {
    const [secretKey, webhookSecret, publishableKey] = await Promise.all([
        getStripeSecretKey(),
        getStripeWebhookSecret(),
        getStripePublishableKey(),
    ]);
    return {
        secretKey,
        webhookSecret,
        publishableKey,
    };
}
/**
 * Obtiene las credenciales de Meta (Facebook/Instagram) desde Firestore o variables de entorno
 */
async function getMetaCredentials() {
    const [appId, appSecret, verifyToken] = await Promise.all([
        getSystemCredential('metaAppId'),
        getSystemCredential('metaAppSecret'),
        getSystemCredential('metaVerifyToken'),
    ]);
    return {
        appId: appId || process.env.META_APP_ID,
        appSecret: appSecret || process.env.META_APP_SECRET,
        verifyToken: verifyToken || process.env.META_VERIFY_TOKEN,
    };
}
/**
 * Obtiene las credenciales de WhatsApp desde Firestore o variables de entorno
 */
async function getWhatsAppCredentials() {
    const [accessToken, phoneNumberId, webhookVerifyToken] = await Promise.all([
        getSystemCredential('whatsappAccessToken'),
        getSystemCredential('whatsappPhoneNumberId'),
        getSystemCredential('whatsappWebhookVerifyToken'),
    ]);
    return {
        accessToken: accessToken || process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID,
        webhookVerifyToken: webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    };
}
/**
 * Obtiene las credenciales de Twilio desde Firestore o variables de entorno
 */
async function getTwilioCredentials() {
    const [accountSid, authToken, phoneNumber] = await Promise.all([
        getSystemCredential('twilioAccountSid'),
        getSystemCredential('twilioAuthToken'),
        getSystemCredential('twilioPhoneNumber'),
    ]);
    return {
        accountSid: accountSid || process.env.TWILIO_ACCOUNT_SID,
        authToken: authToken || process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: phoneNumber || process.env.TWILIO_PHONE_NUMBER,
    };
}
/**
 * Obtiene las credenciales de Email (SendGrid/Resend) desde Firestore o variables de entorno
 */
async function getEmailCredentials() {
    const [apiKey, fromAddress] = await Promise.all([
        getSystemCredential('emailApiKey'),
        getSystemCredential('emailFromAddress'),
    ]);
    return {
        apiKey: apiKey || process.env.EMAIL_API_KEY || process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY,
        fromAddress: fromAddress || process.env.EMAIL_FROM_ADDRESS || process.env.FROM_EMAIL,
    };
}
/**
 * Obtiene todas las credenciales del sistema desde Firestore
 * Útil para verificar qué credenciales están configuradas
 */
async function getAllCredentials() {
    const [stripeCreds, openaiKey, metaCreds, whatsappCreds, twilioCreds, emailCreds,] = await Promise.all([
        getStripeCredentials(),
        getOpenAIApiKey(),
        getMetaCredentials(),
        getWhatsAppCredentials(),
        getTwilioCredentials(),
        getEmailCredentials(),
    ]);
    return {
        stripe: stripeCreds,
        openai: openaiKey ? { apiKey: openaiKey } : undefined,
        meta: metaCreds,
        whatsapp: whatsappCreds,
        twilio: twilioCreds,
        email: emailCreds,
    };
}
/**
 * Obtiene las credenciales de Zoho Mail desde Firestore o variables de entorno
 */
async function getZohoMailCredentials() {
    const [clientId, clientSecret, refreshToken, domain, organizationId, smtpUser, smtpPassword] = await Promise.all([
        getSystemCredential('zohoClientId'),
        getSystemCredential('zohoClientSecret'),
        getSystemCredential('zohoRefreshToken'),
        getSystemCredential('zohoDomain'),
        getSystemCredential('zohoOrganizationId'),
        getSystemCredential('zohoSmtpUser'),
        getSystemCredential('zohoSmtpPassword'),
    ]);
    return {
        clientId: clientId || process.env.ZOHO_CLIENT_ID,
        clientSecret: clientSecret || process.env.ZOHO_CLIENT_SECRET,
        refreshToken: refreshToken || process.env.ZOHO_REFRESH_TOKEN,
        domain: domain || process.env.ZOHO_DOMAIN,
        organizationId: organizationId || process.env.ZOHO_ORGANIZATION_ID,
        smtpUser: smtpUser || process.env.ZOHO_SMTP_USER,
        smtpPassword: smtpPassword || process.env.ZOHO_SMTP_PASSWORD,
    };
}
/**
 * Obtiene las credenciales de proveedores de crédito desde Firestore
 */
async function getCreditProviderCredentials() {
    try {
        const db = (0, shared_1.getFirestore)();
        const credentialsDoc = await getDb().collection('system').doc('credit_providers').get();
        if (!credentialsDoc.exists) {
            return {};
        }
        const data = credentialsDoc.data() || {};
        return {
            experian: data.experian || undefined,
            equifax: data.equifax || undefined,
            transunion: data.transunion || undefined,
        };
    }
    catch (error) {
        console.error('Error fetching credit provider credentials:', error);
        return {};
    }
}
