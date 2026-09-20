import { getFirestore } from '@autodealers/shared';
import {
  formatPlatformEmailFrom,
  normalizePlatformMessageText,
} from '@autodealers/shared/platform-sender';
import { getEmailCredentials, getTwilioCredentials } from './credentials';
import { getWhatsAppConfig } from './whatsapp-config';

type EmailServiceClass = (typeof import('@autodealers/messaging'))['EmailService'];
type SMSServiceClass = (typeof import('@autodealers/messaging'))['SMSService'];
type WhatsAppServiceClass = (typeof import('@autodealers/messaging'))['WhatsAppService'];

async function loadMessaging() {
  return import('@autodealers/messaging');
}

export function resolveEmailProvider(apiKey: string): 'resend' | 'sendgrid' {
  return apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
}

/** Dirección remitente: credenciales → platformEmail → env → default (con nombre de marca). */
export async function resolveDefaultFromAddress(): Promise<string> {
  const creds = await getEmailCredentials();
  if (creds.fromAddress?.trim()) return formatPlatformEmailFrom(creds.fromAddress);

  try {
    const mainDoc = await getFirestore()
      .collection('system_settings')
      .doc('main')
      .get();
    const platformEmail = mainDoc.data()?.platformEmail;
    if (typeof platformEmail === 'string' && platformEmail.includes('@')) {
      return formatPlatformEmailFrom(platformEmail);
    }
  } catch {
    // non-critical
  }

  return formatPlatformEmailFrom(process.env.EMAIL_FROM_ADDRESS);
}

export async function createEmailService(): Promise<{
  service: InstanceType<EmailServiceClass>;
  fromAddress: string;
} | null> {
  const creds = await getEmailCredentials();
  if (!creds.apiKey?.trim()) return null;

  const { EmailService } = await loadMessaging();
  const fromAddress = await resolveDefaultFromAddress();
  return {
    service: new EmailService(
      creds.apiKey,
      resolveEmailProvider(creds.apiKey),
      fromAddress
    ),
    fromAddress,
  };
}

export async function createSmsService(): Promise<InstanceType<SMSServiceClass> | null> {
  const creds = await getTwilioCredentials();
  if (!creds.accountSid || !creds.authToken || !creds.phoneNumber) return null;
  const { SMSService } = await loadMessaging();
  return new SMSService(creds.accountSid, creds.authToken, creds.phoneNumber);
}

export async function createWhatsAppServiceForTenant(
  tenantId: string
): Promise<{ service: InstanceType<WhatsAppServiceClass>; phoneNumberId: string } | null> {
  const config = await getWhatsAppConfig(tenantId);
  if (!config?.accessToken?.trim() || !config.phoneNumberId?.trim()) return null;
  const { WhatsAppService } = await loadMessaging();
  return {
    service: new WhatsAppService(config.accessToken, config.phoneNumberId),
    phoneNumberId: config.phoneNumberId,
  };
}

export async function sendOutboundEmail(
  to: string,
  subject: string,
  html: string,
  tenantId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const configured = await createEmailService();
  if (!configured) {
    return { success: false, error: 'Email API key not configured' };
  }

  const result = await configured.service.sendEmail({
    tenantId,
    channel: 'email',
    direction: 'outbound',
    from: configured.fromAddress,
    to,
    content: normalizePlatformMessageText(html),
    metadata: { subject: normalizePlatformMessageText(subject) },
  });

  return {
    success: result.status === 'sent',
    messageId: result.externalId || result.id || undefined,
    error: result.error,
  };
}

export async function sendOutboundSms(
  to: string,
  content: string,
  tenantId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sms = await createSmsService();
  if (!sms) {
    return { success: false, error: 'Twilio not configured' };
  }

  const creds = await getTwilioCredentials();
  const result = await sms.sendSMS({
    tenantId,
    channel: 'sms',
    direction: 'outbound',
    from: creds.phoneNumber || '',
    to,
    content: normalizePlatformMessageText(content),
  });

  return {
    success: result.status === 'sent',
    messageId: result.externalId || result.id || undefined,
    error: result.error,
  };
}

export async function sendOutboundWhatsApp(
  to: string,
  content: string,
  tenantId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const wa = await createWhatsAppServiceForTenant(tenantId);
  if (!wa) {
    return { success: false, error: 'WhatsApp not configured for tenant' };
  }

  const result = await wa.service.sendMessage({
    tenantId,
    channel: 'whatsapp',
    direction: 'outbound',
    from: wa.phoneNumberId,
    to,
    content: normalizePlatformMessageText(content),
  });

  return {
    success: result.status === 'sent',
    messageId: result.externalId || result.id || undefined,
    error: result.error,
  };
}
