// Gestión de credenciales del sistema desde Firestore

import { getFirestore } from '@autodealers/shared';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

const db = getFirestore();

/**
 * Obtiene una credencial del sistema.
 *
 * Orden de resolución (SEGURIDAD): primero variables de entorno / secretos de
 * App Hosting (Secret Manager) y, solo como fallback heredado, el documento
 * `system_settings/credentials` de Firestore.
 *
 * @param key    Nombre del campo en Firestore (compatibilidad hacia atrás).
 * @param envVar Nombre explícito de la variable de entorno preferida. Si no se
 *               indica, se prueban `key` y `key.toUpperCase()`.
 */
export async function getSystemCredential(
  key: string,
  envVar?: string
): Promise<string | undefined> {
  // 1) Preferir entorno / Secret Manager
  const envCandidates = envVar ? [envVar] : [key, key.toUpperCase()];
  for (const name of envCandidates) {
    const v = process.env[name];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }

  // 2) Fallback heredado: Firestore (se irá retirando al migrar los secretos)
  try {
    const credentialsDoc = await getDb().collection('system_settings').doc('credentials').get();

    if (credentialsDoc.exists) {
      const data = credentialsDoc.data();
      const raw = data?.[key];
      if (raw != null && String(raw).trim() !== '') {
        return String(raw).trim();
      }
    }
  } catch (error) {
    console.error(`Error fetching credential ${key} from Firestore:`, error);
  }

  return undefined;
}

/**
 * Obtiene la API Key de OpenAI
 */
export async function getOpenAIApiKey(): Promise<string | undefined> {
  return getSystemCredential('openaiApiKey', 'OPENAI_API_KEY');
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
 * Obtiene la Secret Key de Stripe desde Firestore o variables de entorno.
 * Si STRIPE_SECRET_KEY en Secret Manager es placeholder/inválida, usa Admin (Firestore).
 */
export async function getStripeSecretKey(): Promise<string | undefined> {
  const fromEnv = readEnvCredential('STRIPE_SECRET_KEY');
  if (isValidStripeSecretKey(fromEnv)) {
    return fromEnv;
  }

  const fromFirestore = await getFirestoreCredential('stripeSecretKey');
  if (isValidStripeSecretKey(fromFirestore)) {
    if (fromEnv) {
      console.warn(
        '[stripe] STRIPE_SECRET_KEY del entorno es inválida o placeholder; usando clave guardada en Admin.'
      );
    }
    return fromFirestore;
  }

  return fromEnv || fromFirestore;
}

/** Signing secret de Stripe (Dashboard → Webhook → Signing secret). No confundir con la URL del endpoint. */
export function isValidStripeWebhookSecret(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('whsec_') && trimmed.length > 12;
}

const STRIPE_SECRET_PLACEHOLDER_MARKERS = [
  'your_secret_key',
  'replace_with',
  'placeholder',
  'example',
  'changeme',
  'todo',
  'xxxxx',
];

/** Rechaza claves de ejemplo/placeholder antes de llamar a la API de Stripe. */
export function isValidStripeSecretKey(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith('sk_live_') && !trimmed.startsWith('sk_test_')) return false;
  if (trimmed.length < 32) return false;
  const lower = trimmed.toLowerCase();
  return !STRIPE_SECRET_PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

export function isValidStripePublishableKey(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith('pk_live_') && !trimmed.startsWith('pk_test_')) return false;
  if (trimmed.length < 32) return false;
  const lower = trimmed.toLowerCase();
  return !STRIPE_SECRET_PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function readEnvCredential(...names: string[]): string | undefined {
  for (const name of names) {
    const v = process.env[name];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return undefined;
}

async function getFirestoreCredential(key: string): Promise<string | undefined> {
  try {
    const credentialsDoc = await getDb().collection('system_settings').doc('credentials').get();
    if (credentialsDoc.exists) {
      const raw = credentialsDoc.data()?.[key];
      if (raw != null && String(raw).trim() !== '') {
        return String(raw).trim();
      }
    }
  } catch (error) {
    console.error(`Error fetching credential ${key} from Firestore:`, error);
  }
  return undefined;
}

export function stripeSecretKeyConfigError(): string {
  return (
    'La clave secreta de Stripe no está configurada correctamente. ' +
    'Actualízala en Admin → Configuración → General → Stripe (sk_live_... completa) ' +
    'o en Firebase Secret Manager (STRIPE_SECRET_KEY).'
  );
}

function resolveStripeWebhookSecret(fromFirestore: string | undefined): string | undefined {
  // Preferir entorno / Secret Manager sobre Firestore (heredado)
  const fromEnv = process.env.STRIPE_WEBHOOK_SECRET;
  if (isValidStripeWebhookSecret(fromEnv)) {
    return fromEnv!.trim();
  }
  if (isValidStripeWebhookSecret(fromFirestore)) {
    return fromFirestore!.trim();
  }
  const raw = fromFirestore?.trim();
  if (raw?.startsWith('http://') || raw?.startsWith('https://')) {
    console.warn(
      '[stripe] stripeWebhookSecret en Firestore es una URL; debe ser whsec_... (Signing secret en Stripe Dashboard).'
    );
  }
  return undefined;
}

/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
export async function getStripeWebhookSecret(): Promise<string | undefined> {
  const key = await getSystemCredential('stripeWebhookSecret');
  return resolveStripeWebhookSecret(key);
}

/**
 * Webhook secret para la app Advertiser (segunda URL en Stripe Dashboard).
 * Orden: Firestore `stripeAdvertiserWebhookSecret` → env `STRIPE_ADVERTISER_WEBHOOK_SECRET`
 * → mismo valor que {@link getStripeWebhookSecret} (comportamiento histórico si no configuras nada aparte).
 */
export async function getStripeAdvertiserWebhookSecret(): Promise<string | undefined> {
  // env / Secret Manager primero, luego Firestore (heredado), luego el secret común
  const resolved = await getSystemCredential(
    'stripeAdvertiserWebhookSecret',
    'STRIPE_ADVERTISER_WEBHOOK_SECRET'
  );
  if (resolved != null && String(resolved).trim() !== '') {
    return String(resolved).trim();
  }
  return await getStripeWebhookSecret();
}

/**
 * Obtiene el Publishable Key de Stripe desde Firestore o variables de entorno.
 * Si la variable de entorno es placeholder/inválida, usa Admin (Firestore).
 */
export async function getStripePublishableKey(): Promise<string | undefined> {
  const fromEnv = readEnvCredential('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_PUBLISHABLE_KEY');
  if (isValidStripePublishableKey(fromEnv)) {
    return fromEnv;
  }

  const fromFirestore = await getFirestoreCredential('stripePublishableKey');
  if (isValidStripePublishableKey(fromFirestore)) {
    if (fromEnv) {
      console.warn(
        '[stripe] Publishable key del entorno es inválida o placeholder; usando clave guardada en Admin.'
      );
    }
    return fromFirestore;
  }

  return fromEnv || fromFirestore;
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
    getSystemCredential('metaAppId', 'META_APP_ID'),
    getSystemCredential('metaAppSecret', 'META_APP_SECRET'),
    getSystemCredential('metaVerifyToken', 'META_VERIFY_TOKEN'),
  ]);

  return { appId, appSecret, verifyToken };
}

/** Token de Conversions API (Events Manager → Ajustes del píxel). Nunca exponer al cliente. */
export async function getMetaCapiAccessToken(): Promise<string | undefined> {
  const primary = await getSystemCredential('metaCapiAccessToken', 'META_CAPI_ACCESS_TOKEN');
  if (primary) return primary;
  return getSystemCredential('metaPixelAccessToken', 'META_PIXEL_ACCESS_TOKEN');
}

/** TikTok Developer Portal → Login Kit / Content Posting API */
export async function getTikTokCredentials(): Promise<{
  clientKey?: string;
  clientSecret?: string;
}> {
  const [clientKey, clientSecret] = await Promise.all([
    getSystemCredential('tiktokClientKey', 'TIKTOK_CLIENT_KEY'),
    getSystemCredential('tiktokClientSecret', 'TIKTOK_CLIENT_SECRET'),
  ]);
  return { clientKey, clientSecret };
}

/** Google Cloud Console → OAuth client (YouTube Data API v3) */
export async function getYouTubeCredentials(): Promise<{
  clientId?: string;
  clientSecret?: string;
}> {
  const [clientId, clientSecret] = await Promise.all([
    getSystemCredential('youtubeClientId', 'YOUTUBE_CLIENT_ID'),
    getSystemCredential('youtubeClientSecret', 'YOUTUBE_CLIENT_SECRET'),
  ]);
  return { clientId, clientSecret };
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
    getSystemCredential('whatsappAccessToken', 'WHATSAPP_ACCESS_TOKEN'),
    getSystemCredential('whatsappPhoneNumberId', 'WHATSAPP_PHONE_NUMBER_ID'),
    getSystemCredential('whatsappWebhookVerifyToken', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
  ]);

  return { accessToken, phoneNumberId, webhookVerifyToken };
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
    getSystemCredential('twilioAccountSid', 'TWILIO_ACCOUNT_SID'),
    getSystemCredential('twilioAuthToken', 'TWILIO_AUTH_TOKEN'),
    getSystemCredential('twilioPhoneNumber', 'TWILIO_PHONE_NUMBER'),
  ]);

  return { accountSid, authToken, phoneNumber };
}

/**
 * Obtiene las credenciales de Email (SendGrid/Resend) desde Firestore o variables de entorno
 */
export async function getEmailCredentials(): Promise<{
  apiKey?: string;
  fromAddress?: string;
}> {
  const [apiKey, fromAddress] = await Promise.all([
    getSystemCredential('emailApiKey', 'EMAIL_API_KEY'),
    getSystemCredential('emailFromAddress', 'EMAIL_FROM_ADDRESS'),
  ]);

  return {
    apiKey: apiKey || process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY,
    fromAddress: fromAddress || process.env.FROM_EMAIL,
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
    getSystemCredential('zohoClientId', 'ZOHO_CLIENT_ID'),
    getSystemCredential('zohoClientSecret', 'ZOHO_CLIENT_SECRET'),
    getSystemCredential('zohoRefreshToken', 'ZOHO_REFRESH_TOKEN'),
    getSystemCredential('zohoDomain', 'ZOHO_DOMAIN'),
    getSystemCredential('zohoOrganizationId', 'ZOHO_ORGANIZATION_ID'),
    getSystemCredential('zohoSmtpUser', 'ZOHO_SMTP_USER'),
    getSystemCredential('zohoSmtpPassword', 'ZOHO_SMTP_PASSWORD'),
  ]);

  return {
    clientId,
    clientSecret,
    refreshToken,
    domain,
    organizationId,
    smtpUser,
    smtpPassword,
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



