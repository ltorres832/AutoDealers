import { addInteraction, createMessage, getLeadById, updateLead } from '@autodealers/crm';
import type { Message } from '@autodealers/crm';
import { createWhatsAppServiceForTenant } from './messaging-outbound';
import { getWhatsAppConfig, isPlatformWhatsAppConfigured } from './whatsapp-config';

/** Dígitos E.164 sin + para la API de WhatsApp Cloud. */
export function normalizeWhatsAppRecipient(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `1${digits}`;
  }
  return digits;
}

export function isValidWhatsAppRecipient(phone: string): boolean {
  const digits = normalizeWhatsAppRecipient(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export type WhatsAppConnectionStatus = {
  connected: boolean;
  platformConfigured: boolean;
  phoneNumberId: string | null;
  platformManaged: boolean;
  message: string;
};

export async function getWhatsAppConnectionStatus(
  tenantId: string
): Promise<WhatsAppConnectionStatus> {
  const platformConfigured = await isPlatformWhatsAppConfigured();
  const config = await getWhatsAppConfig(tenantId);

  if (!config?.accessToken?.trim() || !config.phoneNumberId?.trim()) {
    return {
      connected: false,
      platformConfigured,
      phoneNumberId: null,
      platformManaged: false,
      message: platformConfigured
        ? 'Conecta WhatsApp en Configuración → Integraciones.'
        : 'El administrador debe configurar WhatsApp Business en el panel (General → WhatsApp).',
    };
  }

  const { getFirestore } = await import('@autodealers/shared');
  const db = getFirestore();
  const intSnap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', 'whatsapp')
    .where('status', '==', 'active')
    .limit(1)
    .get();

  const platformManaged = intSnap.docs[0]?.data()?.platformManaged === true;

  return {
    connected: true,
    platformConfigured,
    phoneNumberId: config.phoneNumberId,
    platformManaged,
    message: 'WhatsApp conectado y listo para enviar mensajes.',
  };
}

function humanizeWhatsAppError(error?: string): string {
  if (!error) return 'No se pudo enviar el mensaje por WhatsApp.';
  const lower = error.toLowerCase();
  if (lower.includes('131047') || lower.includes('24 hour')) {
    return 'Fuera de la ventana de 24 h: el cliente debe escribirte primero o usa una plantilla aprobada por Meta.';
  }
  if (lower.includes('131026')) {
    return 'El número del cliente no tiene WhatsApp o no es válido.';
  }
  if (lower.includes('not configured')) {
    return 'WhatsApp no está conectado. Ve a Integraciones y conéctalo.';
  }
  return error;
}

export async function sendWhatsAppMessageToLead(params: {
  tenantId: string;
  leadId: string;
  content: string;
  senderUserId: string;
  aiGenerated?: boolean;
}): Promise<{ success: boolean; message?: Message; error?: string }> {
  const content = params.content.trim();
  if (content.length < 1) {
    return { success: false, error: 'El mensaje no puede estar vacío.' };
  }

  const lead = await getLeadById(params.tenantId, params.leadId);
  if (!lead) {
    return { success: false, error: 'Lead no encontrado.' };
  }

  const rawPhone = lead.contact?.phone?.trim();
  if (!rawPhone) {
    return {
      success: false,
      error: 'Este lead no tiene teléfono. Agrégalo en la ficha del lead para enviar WhatsApp.',
    };
  }

  if (!isValidWhatsAppRecipient(rawPhone)) {
    return { success: false, error: 'El teléfono del lead no es válido para WhatsApp.' };
  }

  const to = normalizeWhatsAppRecipient(rawPhone);
  const wa = await createWhatsAppServiceForTenant(params.tenantId);
  if (!wa) {
    return {
      success: false,
      error: 'WhatsApp no está conectado. Ve a Configuración → Integraciones.',
    };
  }

  const result = await wa.service.sendMessage({
    tenantId: params.tenantId,
    leadId: params.leadId,
    channel: 'whatsapp',
    direction: 'outbound',
    from: wa.phoneNumberId,
    to,
    content,
    metadata: {
      senderUserId: params.senderUserId,
      aiGenerated: params.aiGenerated ?? false,
    },
  });

  const status = result.status === 'sent' ? 'sent' : 'failed';
  const message = await createMessage({
    tenantId: params.tenantId,
    leadId: params.leadId,
    channel: 'whatsapp',
    direction: 'outbound',
    from: wa.phoneNumberId,
    to,
    content,
    status,
    aiGenerated: params.aiGenerated ?? false,
    metadata: {
      externalId: result.externalId || result.id || null,
      senderUserId: params.senderUserId,
      deliveryError: result.error || null,
    },
  });

  if (result.status !== 'sent') {
    return {
      success: false,
      message,
      error: humanizeWhatsAppError(result.error),
    };
  }

  await addInteraction(params.tenantId, params.leadId, {
    type: 'message',
    content: `[WhatsApp] ${content}`,
    userId: params.senderUserId,
  });

  await updateLead(params.tenantId, params.leadId, {
    updatedAt: new Date(),
  } as Record<string, unknown>);

  return { success: true, message };
}

export async function storeInboundWhatsAppMessage(params: {
  tenantId: string;
  leadId: string;
  from: string;
  to: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<Message> {
  return createMessage({
    tenantId: params.tenantId,
    leadId: params.leadId,
    channel: 'whatsapp',
    direction: 'inbound',
    from: params.from,
    to: params.to,
    content: params.content,
    status: 'delivered',
    aiGenerated: false,
    metadata: { ...(params.metadata || {}), isRead: false },
  });
}
