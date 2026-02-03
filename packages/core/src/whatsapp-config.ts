// Gestión de configuración de WhatsApp por tenant

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

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
      return null;
    }

    const integration = integrationsSnapshot.docs[0].data();
    return {
      enabled: true,
      phoneNumberId: integration.phoneNumberId || '',
      accessToken: integration.accessToken || '', // TODO: Desencriptar
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
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


