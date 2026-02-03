// Sistema de envío automático de comunicaciones

import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';
import { 
  getActiveTemplateForEvent, 
  replaceTemplateVariables,
  replaceTemplateSubject,
  TemplateType,
  TemplateEvent 
} from './communication-templates';
import { getUserById } from './users';
import { getTenantById } from './tenants';
import { logCommunication } from './communication-logs';

/**
 * Envía una comunicación automática según el evento
 */
export async function sendAutomaticCommunication(
  event: TemplateEvent,
  type: TemplateType,
  subscriptionId: string,
  additionalVariables?: Record<string, string | number>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Obtener template activo para el evento
    const template = await getActiveTemplateForEvent(event, type);
    
    if (!template) {
      console.warn(`No template found for event ${event} and type ${type}`);
      return { success: false, error: 'Template not found' };
    }

    // Obtener datos de la suscripción (import dinámico para evitar dependencia circular)
    const { getSubscriptionById } = await import('@autodealers/billing');
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    // Obtener datos del usuario
    const user = await getUserById(subscription.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Obtener datos del tenant
    const tenant = await getTenantById(subscription.tenantId);
    if (!tenant) {
      return { success: false, error: 'Tenant not found' };
    }

    // Obtener datos de la membresía (import dinámico para evitar dependencia circular)
    const { getMembershipById } = await import('@autodealers/billing');
    const membership = await getMembershipById(subscription.membershipId);
    if (!membership) {
      return { success: false, error: 'Membership not found' };
    }

    // Preparar variables
    const variables: Record<string, string | number> = {
      userName: user.name,
      userEmail: user.email,
      tenantName: tenant.name,
      membershipName: membership.name,
      amount: membership.price,
      currency: membership.currency,
      periodStart: subscription.currentPeriodStart.toLocaleDateString('es-ES'),
      periodEnd: subscription.currentPeriodEnd.toLocaleDateString('es-ES'),
      daysPastDue: subscription.daysPastDue || 0,
      ...additionalVariables,
    };

    // Reemplazar variables en el template
    const processedContent = replaceTemplateVariables(template, variables);
    const processedSubject = template.subject 
      ? replaceTemplateSubject(template, variables)
      : undefined;

    // Enviar según el tipo
    let result: { success: boolean; messageId?: string; error?: string };
    
    switch (type) {
      case 'email':
        result = await sendEmail(user.email, processedSubject || '', processedContent);
        break;
      case 'sms':
        result = await sendSMS(user.email, processedContent);
        break;
      case 'whatsapp':
        result = await sendWhatsApp(user.email, processedContent);
        break;
      default:
        result = { success: false, error: 'Invalid communication type' };
    }

    // Registrar en logs
    try {
      await logCommunication({
        templateId: template.id,
        templateName: template.name,
        event,
        type,
        recipientId: user.id,
        recipientEmail: user.email,
        recipientName: user.name || user.email,
        tenantId: subscription.tenantId,
        tenantName: tenant.name,
        status: result.success ? 'success' : 'failed',
        messageId: result.messageId,
        error: result.error,
        metadata: {
          subscriptionId,
          membershipName: membership.name,
        },
      });
    } catch (logError) {
      console.error('Error logging communication:', logError);
      // No fallar el envío por error de logging
    }

    return result;
  } catch (error) {
    console.error('Error sending automatic communication:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Envía un email
 */
async function sendEmail(
  to: string,
  subject: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Implementar con servicio de email (SendGrid, AWS SES, etc.)
    // Por ahora, solo registrar
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL] Content: ${content}`);
    
    // Registrar en Firestore para tracking
    const { getFirestore } = await import('./firebase');
    const db = getFirestore();
    await db.collection('communication_logs').add({
      type: 'email',
      to,
      subject,
      content,
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageId: `email_${Date.now()}` };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email send failed' 
    };
  }
}

/**
 * Envía un SMS
 */
async function sendSMS(
  to: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Implementar con servicio de SMS (Twilio, AWS SNS, etc.)
    console.log(`[SMS] To: ${to}, Content: ${content}`);
    
    // Registrar en Firestore
    const db = getFirestore();
    await db.collection('communication_logs').add({
      type: 'sms',
      to,
      content,
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageId: `sms_${Date.now()}` };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SMS send failed' 
    };
  }
}

/**
 * Envía un mensaje de WhatsApp
 */
async function sendWhatsApp(
  to: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Implementar con WhatsApp Business API
    console.log(`[WHATSAPP] To: ${to}, Content: ${content}`);
    
    // Registrar en Firestore
    const db = getFirestore();
    await db.collection('communication_logs').add({
      type: 'whatsapp',
      to,
      content,
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageId: `whatsapp_${Date.now()}` };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'WhatsApp send failed' 
    };
  }
}

