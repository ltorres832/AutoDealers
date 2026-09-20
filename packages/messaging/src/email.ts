// Servicio de Email

import { MessagePayload, MessageResponse } from './types';
import {
  defaultPlatformEmailSubject,
  formatPlatformEmailFrom,
  normalizePlatformMessageText,
  parseEmailAddress,
  PLATFORM_NAME,
} from '@autodealers/shared/platform-sender';

export class EmailService {
  private apiKey: string;
  private provider: 'sendgrid' | 'resend' | 'zoho_smtp';
  private defaultFrom: string;

  constructor(
    apiKey: string,
    provider: 'sendgrid' | 'resend' = 'resend',
    defaultFrom = 'noreply@autodealers.com'
  ) {
    this.apiKey = apiKey;
    this.provider = provider;
    this.defaultFrom = defaultFrom;
  }

  /**
   * Envía un email
   */
  async sendEmail(payload: MessagePayload): Promise<MessageResponse> {
    const normalizedPayload: MessagePayload = {
      ...payload,
      content: normalizePlatformMessageText(payload.content),
      metadata: payload.metadata
        ? {
            ...payload.metadata,
            ...(payload.metadata.subject
              ? { subject: normalizePlatformMessageText(String(payload.metadata.subject)) }
              : {}),
          }
        : payload.metadata,
    };

    if (this.provider === 'zoho_smtp') {
      return this.sendWithZohoSMTP(normalizedPayload);
    }
    if (this.provider === 'resend') {
      return this.sendWithResend(normalizedPayload);
    }
    return this.sendWithSendGrid(normalizedPayload);
  }

  private resolveFrom(payload: MessagePayload): string {
    return formatPlatformEmailFrom(payload.from?.trim() || this.defaultFrom);
  }

  private resolveHeaders(payload: MessagePayload): Record<string, string> {
    const headers = payload.metadata?.headers;
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  /**
   * Envía con Resend
   */
  private async sendWithResend(payload: MessagePayload): Promise<MessageResponse> {
    try {
      const body: Record<string, unknown> = {
        from: this.resolveFrom(payload),
        to: payload.to,
        subject: payload.metadata?.subject || defaultPlatformEmailSubject(),
        html: payload.content,
      };
      const headers = this.resolveHeaders(payload);
      if (Object.keys(headers).length > 0) {
        body.headers = headers;
      }

      if (payload.emailAttachments?.length) {
        body.attachments = payload.emailAttachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString('base64'),
        }));
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { id?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return {
        id: data.id || '',
        status: 'sent',
        externalId: data.id,
      };
    } catch (error) {
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía con SendGrid
   */
  private async sendWithSendGrid(payload: MessagePayload): Promise<MessageResponse> {
    try {
      const parsedFrom = parseEmailAddress(this.resolveFrom(payload));
      const sgBody: Record<string, unknown> = {
        personalizations: [{ to: [{ email: payload.to }] }],
        from: {
          email: parsedFrom.email,
          name: parsedFrom.name || PLATFORM_NAME,
        },
        subject: payload.metadata?.subject || defaultPlatformEmailSubject(),
        content: [{ type: 'text/html', value: payload.content }],
      };
      const headers = this.resolveHeaders(payload);
      if (Object.keys(headers).length > 0) {
        sgBody.headers = headers;
        if (headers['Reply-To']) {
          sgBody.reply_to = { email: headers['Reply-To'] };
        }
      }

      if (payload.emailAttachments?.length) {
        sgBody.attachments = payload.emailAttachments.map((a) => ({
          content: Buffer.from(a.content).toString('base64'),
          filename: a.filename,
          type: a.contentType || 'application/pdf',
          disposition: 'attachment',
        }));
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sgBody),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `SendGrid error ${response.status}`);
      }

      const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;
      return {
        id: messageId,
        status: 'sent',
        externalId: messageId,
      };
    } catch (error) {
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía con Zoho SMTP
   */
  private async sendWithZohoSMTP(payload: MessagePayload): Promise<MessageResponse> {
    try {
      const { ZohoSMTPService } = await import('./smtp-zoho');
      const smtpService = ZohoSMTPService.fromEnvironment();

      if (!smtpService) {
        throw new Error('Zoho SMTP not configured');
      }

      return await smtpService.sendEmail(payload);
    } catch (error) {
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error sending email via Zoho SMTP',
      };
    }
  }
}
