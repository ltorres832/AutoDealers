// Gestión de credenciales del sistema desde Firestore

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

const db = getFirestore();

/**
 * Obtiene una credencial del sistema desde Firestore
 * Si no existe en Firestore, intenta obtenerla de process.env como fallback
 */
export async function getSystemCredential(key: string): Promise<string | undefined> {
  try {
    const credentialsDoc = await getDb().collection('system_settings').doc('credentials').get();
    
    if (credentialsDoc.exists) {
      const data = credentialsDoc.data();
      if (data && data[key]) {
        return data[key] as string;
      }
    }
  } catch (error) {
    console.error(`Error fetching credential ${key} from Firestore:`, error);
  }

  // Fallback a variables de entorno
  return process.env[key] || process.env[key.toUpperCase()];
}

/**
 * Obtiene la API Key de OpenAI
 */
export async function getOpenAIApiKey(): Promise<string | undefined> {
  return await getSystemCredential('openaiApiKey') || process.env.OPENAI_API_KEY;
}

/**
 * Obtiene todas las credenciales del sistema
 */
export async function getAllSystemCredentials(): Promise<Record<string, string>> {
  try {
    const credentialsDoc = await getDb().collection('system_settings').doc('credentials').get();
    
    if (credentialsDoc.exists) {
      const data = credentialsDoc.data() || {};
      return data as Record<string, string>;
    }
  } catch (error) {
    console.error('Error fetching credentials from Firestore:', error);
  }

  // Devolver objeto vacío si no hay credenciales en Firestore
  return {};
}

/**
 * Obtiene la Secret Key de Stripe desde Firestore o variables de entorno
 */
export async function getStripeSecretKey(): Promise<string | undefined> {
  const key = await getSystemCredential('stripeSecretKey');
  return key || process.env.STRIPE_SECRET_KEY;
}

/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
export async function getStripeWebhookSecret(): Promise<string | undefined> {
  const key = await getSystemCredential('stripeWebhookSecret');
  return key || process.env.STRIPE_WEBHOOK_SECRET;
}

/**
 * Obtiene el Publishable Key de Stripe desde Firestore o variables de entorno
 */
export async function getStripePublishableKey(): Promise<string | undefined> {
  const key = await getSystemCredential('stripePublishableKey');
  return key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

/**
 * Obtiene todas las credenciales de Stripe
 */
export async function getStripeCredentials(): Promise<{
  secretKey?: string;
  webhookSecret?: string;
  publishableKey?: string;
}> {
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
export async function getMetaCredentials(): Promise<{
  appId?: string;
  appSecret?: string;
  verifyToken?: string;
}> {
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
export async function getWhatsAppCredentials(): Promise<{
  accessToken?: string;
  phoneNumberId?: string;
  webhookVerifyToken?: string;
}> {
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
export async function getTwilioCredentials(): Promise<{
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}> {
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
export async function getEmailCredentials(): Promise<{
  apiKey?: string;
  fromAddress?: string;
}> {
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
export async function getAllCredentials(): Promise<{
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
}> {
  const [
    stripeCreds,
    openaiKey,
    metaCreds,
    whatsappCreds,
    twilioCreds,
    emailCreds,
  ] = await Promise.all([
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
export async function getZohoMailCredentials(): Promise<{
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  domain?: string;
  organizationId?: string;
  smtpUser?: string;
  smtpPassword?: string;
}> {
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
export async function getCreditProviderCredentials(): Promise<{
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
}> {
  try {
    const db = getFirestore();
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
  } catch (error) {
    console.error('Error fetching credit provider credentials:', error);
    return {};
  }
}



