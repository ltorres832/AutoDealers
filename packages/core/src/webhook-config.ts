import { getMetaCredentials, getWhatsAppCredentials } from './credentials';

/**
 * Token del challenge GET de Meta (Facebook / Instagram / WhatsApp).
 * Debe coincidir con "Verify token" en Meta App → Webhooks.
 *
 * Soporta `FACEBOOK_VERIFY_TOKEN` o `META_VERIFY_TOKEN` (como en .env.example).
 */
export function getFacebookWebhookVerifyToken(): string {
  const t = process.env.FACEBOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;
  if (t != null && String(t).trim() !== '') {
    return String(t).trim();
  }
  return 'default_verify_token';
}

/**
 * Mismo verify token que Meta, con prioridad:
 * 1) `FACEBOOK_VERIFY_TOKEN` / `META_VERIFY_TOKEN` en entorno
 * 2) Firestore `system_settings/credentials` → `metaVerifyToken` (pantalla Admin → Meta)
 * 3) Mismo documento → `whatsappWebhookVerifyToken` (si solo configuraste WhatsApp)
 * 4) `default_verify_token` (solo desarrollo; en producción configura uno de los anteriores)
 *
 * Usar en rutas server async (Admin, Cloud Functions) para que coincida con lo guardado en Admin.
 */
export async function resolveMetaWebhookVerifyToken(): Promise<string> {
  const fromEnv = getFacebookWebhookVerifyToken();
  if (fromEnv !== 'default_verify_token') {
    return fromEnv;
  }

  try {
    const meta = await getMetaCredentials();
    if (meta.verifyToken != null && String(meta.verifyToken).trim() !== '') {
      return String(meta.verifyToken).trim();
    }
  } catch {
    /* Firestore no listo o sin permisos en arranque */
  }

  try {
    const wa = await getWhatsAppCredentials();
    if (wa.webhookVerifyToken != null && String(wa.webhookVerifyToken).trim() !== '') {
      return String(wa.webhookVerifyToken).trim();
    }
  } catch {
    /* ignore */
  }

  return 'default_verify_token';
}
