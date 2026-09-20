import {
  formatPlatformEmailFrom,
  normalizePlatformMessageText,
  parseEmailAddress,
} from '@autodealers/shared/platform-sender';
import { getEmailCredentials } from './credentials';

export type EmailProvider = 'resend' | 'sendgrid';

export interface SendConfiguredEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string | null;
}

export interface SendConfiguredEmailResult {
  sent: boolean;
  provider?: EmailProvider;
  from?: string;
  externalId?: string;
  error?: string;
}

function resolveConfiguredEmailProvider(apiKey: string): EmailProvider {
  return apiKey.includes('re_') || apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
}

function formatBrandedFrom(from: string): string {
  return formatPlatformEmailFrom(from);
}

function parseFromAddress(from: string): { email: string; name?: string } {
  return parseEmailAddress(from);
}

export async function getConfiguredEmailFromAddress(): Promise<string> {
  const creds = await getEmailCredentials();
  return formatBrandedFrom(creds.fromAddress || 'noreply@autodealers-online.com');
}

export async function sendConfiguredEmail(
  input: SendConfiguredEmailInput
): Promise<SendConfiguredEmailResult> {
  const creds = await getEmailCredentials();
  const apiKey = creds.apiKey || '';
  const from = formatBrandedFrom(input.from?.trim() || creds.fromAddress || 'noreply@autodealers-online.com');
  const normalizedInput = {
    ...input,
    subject: normalizePlatformMessageText(input.subject),
    html: normalizePlatformMessageText(input.html),
  };

  if (!apiKey) {
    return { sent: false, from, error: 'Email API Key no configurada' };
  }

  const provider = resolveConfiguredEmailProvider(apiKey);
  return provider === 'resend'
    ? sendWithResend({ ...normalizedInput, from }, apiKey)
    : sendWithSendGrid({ ...normalizedInput, from }, apiKey);
}

async function sendWithResend(
  input: Required<Pick<SendConfiguredEmailInput, 'to' | 'subject' | 'html'>> & { from: string },
  apiKey: string
): Promise<SendConfiguredEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: normalizePlatformMessageText(input.html),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };

    if (!response.ok) {
      return {
        sent: false,
        provider: 'resend',
        from: input.from,
        error: data.message || data.error || `Resend error ${response.status}`,
      };
    }

    return { sent: true, provider: 'resend', from: input.from, externalId: data.id };
  } catch (error) {
    return {
      sent: false,
      provider: 'resend',
      from: input.from,
      error: error instanceof Error ? error.message : 'Error desconocido enviando por Resend',
    };
  }
}

async function sendWithSendGrid(
  input: Required<Pick<SendConfiguredEmailInput, 'to' | 'subject' | 'html'>> & { from: string },
  apiKey: string
): Promise<SendConfiguredEmailResult> {
  try {
    const parsedFrom = parseFromAddress(input.from);
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: parsedFrom,
        subject: input.subject,
        content: [{ type: 'text/html', value: input.html }],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        sent: false,
        provider: 'sendgrid',
        from: input.from,
        error: text || `SendGrid error ${response.status}`,
      };
    }

    const externalId = response.headers.get('x-message-id') || undefined;
    return { sent: true, provider: 'sendgrid', from: input.from, externalId };
  } catch (error) {
    return {
      sent: false,
      provider: 'sendgrid',
      from: input.from,
      error: error instanceof Error ? error.message : 'Error desconocido enviando por SendGrid',
    };
  }
}
