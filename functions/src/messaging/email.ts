// Cloud Functions para Emails
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from '@autodealers/messaging';

const db = getFirestore();

// Enviar email
export const sendEmail = onCall(async (request) => {
  const { tenantId, to, subject, content, from, metadata } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !to || !subject || !content) {
    throw new HttpsError('invalid-argument', 'tenantId, to, subject y content son requeridos');
  }

  try {
    // Obtener credenciales de email del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const emailConfig = tenantData?.settings?.email || {};
    const emailApiKey = emailConfig.apiKey || process.env.EMAIL_API_KEY || '';

    if (!emailApiKey) {
      throw new HttpsError('failed-precondition', 'Email API Key no configurada');
    }

    const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_')
      ? 'resend'
      : 'sendgrid';

    const emailService = new EmailService(emailApiKey, emailProvider);

    const response = await emailService.sendEmail({
      tenantId,
      channel: 'email',
      direction: 'outbound',
      from: from || emailConfig.fromAddress || 'noreply@autodealers.com',
      to,
      content,
      metadata: {
        subject,
        ...metadata,
      },
    });

    return { success: response.status === 'sent', messageId: response.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar email: ${error.message}`);
  }
});

// Enviar email con template
export const sendEmailTemplate = onCall(async (request) => {
  const { tenantId, to, templateId, variables } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !to || !templateId) {
    throw new HttpsError('invalid-argument', 'tenantId, to y templateId son requeridos');
  }

  try {
    // Obtener template
    const templateDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('templates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      throw new HttpsError('not-found', 'Template no encontrado');
    }

    const template = templateDoc.data();
    let content = template?.content || '';
    const subject = template?.subject || '';

    // Reemplazar variables
    if (variables) {
      Object.keys(variables).forEach((key) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
      });
    }

    // Enviar email
    const emailConfig = template?.emailConfig || {};
    const emailApiKey = emailConfig.apiKey || process.env.EMAIL_API_KEY || '';

    if (!emailApiKey) {
      throw new HttpsError('failed-precondition', 'Email API Key no configurada');
    }

    const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_')
      ? 'resend'
      : 'sendgrid';

    const emailService = new EmailService(emailApiKey, emailProvider);

    const response = await emailService.sendEmail({
      tenantId,
      channel: 'email',
      direction: 'outbound',
      from: emailConfig.fromAddress || 'noreply@autodealers.com',
      to,
      content,
      metadata: {
        subject: subject || 'Mensaje de AutoDealers',
      },
    });

    return { success: response.status === 'sent', messageId: response.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al enviar email con template: ${error.message}`);
  }
});

// Enviar emails en bulk
export const sendBulkEmail = onCall(async (request) => {
  const { tenantId, recipients, subject, content, from } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !recipients || !Array.isArray(recipients) || !subject || !content) {
    throw new HttpsError('invalid-argument', 'tenantId, recipients (array), subject y content son requeridos');
  }

  try {
    // Obtener credenciales de email
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const emailConfig = tenantData?.settings?.email || {};
    const emailApiKey = emailConfig.apiKey || process.env.EMAIL_API_KEY || '';

    if (!emailApiKey) {
      throw new HttpsError('failed-precondition', 'Email API Key no configurada');
    }

    const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_')
      ? 'resend'
      : 'sendgrid';

    const emailService = new EmailService(emailApiKey, emailProvider);

    // Enviar a cada destinatario
    const results = await Promise.allSettled(
      recipients.map((to: string) =>
        emailService.sendEmail({
          tenantId,
          channel: 'email',
          direction: 'outbound',
          from: from || emailConfig.fromAddress || 'noreply@autodealers.com',
          to,
          content,
          metadata: {
            subject,
          },
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
    throw new HttpsError('internal', `Error al enviar emails en bulk: ${error.message}`);
  }
});


