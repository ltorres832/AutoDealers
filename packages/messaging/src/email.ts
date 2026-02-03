// Servicio de Email

import { MessagePayload, MessageResponse } from './types';

export class EmailService {
  private apiKey: string;
  private provider: 'sendgrid' | 'resend' | 'zoho_smtp';

  constructor(apiKey: string, provider: 'sendgrid' | 'resend' = 'resend') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  /**
   * Envía un email
   */
  async sendEmail(payload: MessagePayload): Promise<MessageResponse> {
    if (this.provider === 'zoho_smtp') {
      return this.sendWithZohoSMTP(payload);
    } else if (this.provider === 'resend') {
      return this.sendWithResend(payload);
    } else {
      return this.sendWithSendGrid(payload);
    }
  }

  /**
   * Envía con Resend
   */
  private async sendWithResend(payload: MessagePayload): Promise<MessageResponse> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@autodealers.com',
          to: payload.to,
          subject: payload.metadata?.subject || 'Mensaje de AutoDealers',
          html: payload.content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return {
        id: data.id,
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
    // TODO: Implementar SendGrid
    return {
      id: '',
      status: 'sent',
    };
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





