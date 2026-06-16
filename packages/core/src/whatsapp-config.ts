// Gestión de configuración de WhatsApp por tenant

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { getWhatsAppCredentials } from './credentials';

const db = getFirestore();

export async function isPlatformWhatsAppConfigured(): Promise<boolean> {
  const creds = await getWhatsAppCredentials();
  return Boolean(creds.accessToken?.trim() && creds.phoneNumberId?.trim());
}

/**
 * Vincula WhatsApp al tenant usando las credenciales globales del admin
 * (system_settings.credentials), igual que Meta App ID/Secret.
 */
export async function provisionTenantWhatsAppFromPlatform(
  tenantId: string,
  leadOwnerUserId?: string
): Promise<
  | { ok: true; integrationId: string; platformManaged: true }
  | { ok: false; reason: 'platform_not_configured' }
> {
  const creds = await getWhatsAppCredentials();
  const phoneNumberId = creds.phoneNumberId?.trim();
  const accessToken = creds.accessToken?.trim();
  if (!phoneNumberId || !accessToken) {
    return { ok: false, reason: 'platform_not_configured' };
  }

  const existingSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', 'whatsapp')
    .limit(1)
    .get();

  const payload: Record<string, unknown> = {
    type: 'whatsapp',
    status: 'active',
    platformManaged: true,
    phoneNumberId,
    accessToken,
    credentials: { phoneNumberId, accessToken },
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };
  if (leadOwnerUserId?.trim()) {
    payload.leadOwnerUserId = leadOwnerUserId.trim();
  }

  if (!existingSnapshot.empty) {
    const ref = existingSnapshot.docs[0].ref;
    await ref.update(payload);
    return { ok: true, integrationId: ref.id, platformManaged: true };
  }

  const ref = db.collection('tenants').doc(tenantId).collection('integrations').doc();
  await ref.set({
    ...payload,
    settings: {},
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return { ok: true, integrationId: ref.id, platformManaged: true };
}

async function readPlatformWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const creds = await getWhatsAppCredentials();
  const phoneNumberId = creds.phoneNumberId?.trim();
  const accessToken = creds.accessToken?.trim();
  if (!phoneNumberId || !accessToken) return null;
  return {
    enabled: true,
    phoneNumberId,
    accessToken,
    verifyToken: creds.webhookVerifyToken,
    autoRespond: false,
  };
}

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumberId: string;
  accessToken: string; // Encriptado
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
export async function getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig | null> {
  try {
    // Buscar en integraciones del tenant
    const integrationsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', 'whatsapp')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (integrationsSnapshot.empty) {
      return readPlatformWhatsAppConfig();
    }

    const integration = integrationsSnapshot.docs[0].data();
    const cred = (integration.credentials || {}) as Record<string, unknown>;
    const phoneNumberId = String(
      integration.phoneNumberId || cred.phoneNumberId || cred.phone_number_id || ''
    ).trim();
    const accessToken = String(
      integration.accessToken || cred.accessToken || cred.longLivedUserToken || ''
    ).trim();

    if (!phoneNumberId || !accessToken) {
      return null;
    }

    return {
      enabled: true,
      phoneNumberId,
      accessToken,
      verifyToken: integration.verifyToken,
      webhookUrl: integration.webhookUrl,
      autoRespond: integration.autoRespond || false,
      businessName: integration.businessName,
      businessDescription: integration.businessDescription,
      workingHours: integration.workingHours,
      awayMessage: integration.awayMessage,
      createdAt: integration.createdAt?.toDate(),
      updatedAt: integration.updatedAt?.toDate(),
    } as WhatsAppConfig;
  } catch (error) {
    console.error('Error obteniendo configuración de WhatsApp:', error);
    return null;
  }
}

/**
 * Guarda la configuración de WhatsApp de un tenant
 */
export async function saveWhatsAppConfig(
  tenantId: string,
  config: Partial<WhatsAppConfig>
): Promise<void> {
  try {
    // Buscar integración existente
    const integrationsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', 'whatsapp')
      .limit(1)
      .get();

    const integrationData = {
      type: 'whatsapp',
      status: config.enabled !== false ? 'active' : 'inactive',
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken, // TODO: Encriptar
      verifyToken: config.verifyToken,
      webhookUrl: config.webhookUrl,
      autoRespond: config.autoRespond || false,
      businessName: config.businessName,
      businessDescription: config.businessDescription,
      workingHours: config.workingHours,
      awayMessage: config.awayMessage,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    };

    if (integrationsSnapshot.empty) {
      // Crear nueva integración
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .doc()
        .set({
          ...integrationData,
          createdAt: getFirestoreFieldValue().serverTimestamp(),
        });
    } else {
      // Actualizar integración existente
      await integrationsSnapshot.docs[0].ref.update(integrationData);
    }
  } catch (error) {
    console.error('Error guardando configuración de WhatsApp:', error);
    throw error;
  }
}

/**
 * Obtiene el access token de WhatsApp de un tenant (desencriptado)
 */
export async function getWhatsAppAccessToken(tenantId: string): Promise<string | null> {
  try {
    const config = await getWhatsAppConfig(tenantId);
    if (!config || !config.enabled) {
      return null;
    }
    // TODO: Desencriptar el token
    return config.accessToken;
  } catch (error) {
    console.error('Error obteniendo access token de WhatsApp:', error);
    return null;
  }
}

/**
 * Obtiene el phone number ID de WhatsApp de un tenant
 */
export async function getWhatsAppPhoneNumberId(tenantId: string): Promise<string | null> {
  try {
    const config = await getWhatsAppConfig(tenantId);
    if (!config || !config.enabled) {
      return null;
    }
    return config.phoneNumberId;
  } catch (error) {
    console.error('Error obteniendo phone number ID de WhatsApp:', error);
    return null;
  }
}


