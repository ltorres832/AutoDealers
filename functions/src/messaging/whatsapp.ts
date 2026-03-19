// Cloud Functions para WhatsApp
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { WhatsAppService } from '@autodealers/messaging';

const db = getFirestore();

// Enviar mensaje WhatsApp
export const sendWhatsAppMessage = onCall(async (request) => {
  const { tenantId, to, content, leadId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !to || !content) {
    throw new HttpsError('invalid-argument', 'tenantId, to y content son requeridos');
  }

  try {
    // Obtener configuración de WhatsApp del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const whatsappConfig = tenantData?.settings?.whatsapp || {};
    const accessToken = whatsappConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneNumberId = whatsappConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (!accessToken || !phoneNumberId) {
      throw new HttpsError('failed-precondition', 'Credenciales de WhatsApp no configuradas');
    }

    const whatsappService = new WhatsAppService(accessToken, phoneNumberId);

    const response = await whatsappService.sendMessage({
      tenantId,
      channel: 'whatsapp',
      direction: 'outbound',
      from: phoneNumberId,
      to,
      content,
      leadId,
    });

    // Guardar mensaje en Firestore si hay leadId
    if (leadId && response.status === 'sent') {
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .collection('messages')
        .add({
          channel: 'whatsapp',
          direction: 'outbound',
          from: phoneNumberId,
          to,
          content,
          status: 'sent',
          messageId: response.id,
          createdAt: new Date(),
        });
    }

    return { success: response.status === 'sent', messageId: response.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar mensaje WhatsApp: ${error.message}`);
  }
});

// Procesar webhook de WhatsApp
export const processWhatsAppWebhook = onCall(async (request) => {
  const { webhookData } = request.data;

  if (!webhookData) {
    throw new HttpsError('invalid-argument', 'webhookData es requerido');
  }

  try {
    // Obtener tenantId del número de WhatsApp
    const phoneNumberId =
      webhookData.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || '';

    if (!phoneNumberId) {
      return { received: true, error: 'No phone number ID' };
    }

    // Buscar tenant por número de WhatsApp
    const integrationsSnapshot = await db
      .collection('integrations')
      .where('type', '==', 'whatsapp')
      .where('phoneNumberId', '==', phoneNumberId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    let tenantId: string | null = null;

    if (!integrationsSnapshot.empty) {
      tenantId = integrationsSnapshot.docs[0].data().tenantId || null;
    }

    if (!tenantId) {
      return { received: true, error: 'Tenant not found' };
    }

    // Obtener configuración de WhatsApp
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return { received: true, error: 'Tenant not found' };
    }

    const tenantData = tenantDoc.data();
    const whatsappConfig = tenantData?.settings?.whatsapp || {};
    const accessToken = whatsappConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const tenantPhoneNumberId =
      whatsappConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (!accessToken || !tenantPhoneNumberId) {
      return { received: true, error: 'WhatsApp not configured' };
    }

    const whatsappService = new WhatsAppService(accessToken, tenantPhoneNumberId);
    const messagePayload = await whatsappService.processWebhook(webhookData);

    if (!messagePayload) {
      return { received: true };
    }

    messagePayload.tenantId = tenantId;

    // Guardar mensaje en Firestore
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('messages')
      .add({
        ...messagePayload,
        createdAt: new Date(),
      });

    return { received: true, processed: true };
  } catch (error: any) {
    console.error('Error processing WhatsApp webhook:', error);
    return { received: true, error: error.message };
  }
});

// Enviar notificación WhatsApp
export const sendWhatsAppNotification = onCall(async (request) => {
  const { tenantId, userId, title, message } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !userId || !title || !message) {
    throw new HttpsError('invalid-argument', 'tenantId, userId, title y message son requeridos');
  }

  try {
    // Obtener teléfono del usuario
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data();
    const phone = userData?.phone;

    if (!phone) {
      throw new HttpsError('failed-precondition', 'Usuario no tiene teléfono configurado');
    }

    // Enviar WhatsApp
    const result = await sendWhatsAppMessage({
      tenantId,
      to: phone,
      content: `${title}\n\n${message}`,
    } as any);

    return result;
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar notificación WhatsApp: ${error.message}`);
  }
});


