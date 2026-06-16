// Sistema de envío automático de comunicaciones

import {
  getActiveTemplateForEvent,
  replaceTemplateVariables,
  replaceTemplateSubject,
  TemplateType,
  TemplateEvent,
} from './communication-templates';
import { getUserById } from './users';
import { getTenantById } from './tenants';
import { logCommunication } from './communication-logs';
import {
  sendOutboundEmail,
  sendOutboundSms,
  sendOutboundWhatsApp,
} from './messaging-outbound';

/**
 * Envía una comunicación automática según el evento y plantilla activa.
 */
export async function sendAutomaticCommunication(
  event: TemplateEvent,
  type: TemplateType,
  subscriptionId: string,
  additionalVariables?: Record<string, string | number>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const template = await getActiveTemplateForEvent(event, type);

    if (!template) {
      console.warn(`No template found for event ${event} and type ${type}`);
      return { success: false, error: 'Template not found' };
    }

    const { getSubscriptionById, getMembershipById } = await import('@autodealers/billing');
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    const user = await getUserById(subscription.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const tenant = await getTenantById(subscription.tenantId);
    if (!tenant) {
      return { success: false, error: 'Tenant not found' };
    }

    const membership = await getMembershipById(subscription.membershipId);
    if (!membership) {
      return { success: false, error: 'Membership not found' };
    }

    const variables: Record<string, string | number> = {
      userName: user.name || user.email,
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

    const processedContent = replaceTemplateVariables(template, variables);
    const processedSubject = template.subject
      ? replaceTemplateSubject(template, variables)
      : undefined;

    const phone = user.phone?.trim();
    let result: { success: boolean; messageId?: string; error?: string };

    switch (type) {
      case 'email':
        if (!user.email?.trim()) {
          return { success: false, error: 'User has no email' };
        }
        result = await sendOutboundEmail(
          user.email,
          processedSubject || template.name,
          processedContent,
          subscription.tenantId
        );
        break;
      case 'sms':
        if (!phone) {
          return { success: false, error: 'User has no phone for SMS' };
        }
        result = await sendOutboundSms(phone, processedContent, subscription.tenantId);
        break;
      case 'whatsapp':
        if (!phone) {
          return { success: false, error: 'User has no phone for WhatsApp' };
        }
        result = await sendOutboundWhatsApp(phone, processedContent, subscription.tenantId);
        break;
      default:
        result = { success: false, error: 'Invalid communication type' };
    }

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
    }

    return result;
  } catch (error) {
    console.error('Error sending automatic communication:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Envía comunicaciones de billing sin interrumpir el flujo principal.
 */
export async function trySendBillingCommunication(
  event: TemplateEvent,
  type: TemplateType,
  subscriptionId: string,
  additionalVariables?: Record<string, string | number>
): Promise<void> {
  try {
    const result = await sendAutomaticCommunication(
      event,
      type,
      subscriptionId,
      additionalVariables
    );
    if (!result.success) {
      console.warn(`Billing communication ${event}/${type} skipped:`, result.error);
    }
  } catch (error) {
    console.error(`Billing communication ${event}/${type} failed:`, error);
  }
}

const BILLING_CHANNELS: TemplateType[] = ['email', 'sms', 'whatsapp'];

/**
 * Intenta enviar la comunicación de billing por email, SMS y WhatsApp
 * (cada canal solo si hay plantilla activa y datos del destinatario).
 */
export async function trySendBillingCommunicationAllChannels(
  event: TemplateEvent,
  subscriptionId: string,
  additionalVariables?: Record<string, string | number>
): Promise<void> {
  await Promise.allSettled(
    BILLING_CHANNELS.map((type) =>
      trySendBillingCommunication(event, type, subscriptionId, additionalVariables)
    )
  );
}
