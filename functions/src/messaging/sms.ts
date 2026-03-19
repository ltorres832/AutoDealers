// Cloud Functions para SMS (Twilio)
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { SMSService } from '@autodealers/messaging';

const db = getFirestore();

// Enviar SMS
export const sendSMS = onCall(async (request) => {
  const { tenantId, to, content } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !to || !content) {
    throw new HttpsError('invalid-argument', 'tenantId, to y content son requeridos');
  }

  try {
    // Obtener credenciales de Twilio del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const smsConfig = tenantData?.settings?.sms || {};
    const accountSid = smsConfig.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = smsConfig.authToken || process.env.TWILIO_AUTH_TOKEN || '';
    const phoneNumber = smsConfig.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !phoneNumber) {
      throw new HttpsError('failed-precondition', 'Credenciales de Twilio no configuradas');
    }

    const smsService = new SMSService(accountSid, authToken, phoneNumber);

    const response = await smsService.sendSMS({
      tenantId,
      channel: 'sms',
      direction: 'outbound',
      from: phoneNumber,
      to,
      content,
    });

    return { success: response.status === 'sent', messageId: response.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar SMS: ${error.message}`);
  }
});

// Enviar SMS en bulk
export const sendBulkSMS = onCall(async (request) => {
  const { tenantId, recipients, content } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !recipients || !Array.isArray(recipients) || !content) {
    throw new HttpsError('invalid-argument', 'tenantId, recipients (array) y content son requeridos');
  }

  try {
    // Obtener credenciales de Twilio
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const smsConfig = tenantData?.settings?.sms || {};
    const accountSid = smsConfig.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = smsConfig.authToken || process.env.TWILIO_AUTH_TOKEN || '';
    const phoneNumber = smsConfig.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !phoneNumber) {
      throw new HttpsError('failed-precondition', 'Credenciales de Twilio no configuradas');
    }

    const smsService = new SMSService(accountSid, authToken, phoneNumber);

    // Enviar a cada destinatario
    const results = await Promise.allSettled(
      recipients.map((to: string) =>
        smsService.sendSMS({
          tenantId,
          channel: 'sms',
          direction: 'outbound',
          from: phoneNumber,
          to,
          content,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      success: true,
      total: recipients.length,
      successful,
      failed,
    };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar SMS en bulk: ${error.message}`);
  }
});

// Enviar notificación SMS
export const sendSMSNotification = onCall(async (request) => {
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

    // Enviar SMS
    const result = await sendSMS({
      tenantId,
      to: phone,
      content: `${title}\n\n${message}`,
    } as any);

    return result;
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar notificación SMS: ${error.message}`);
  }
});


