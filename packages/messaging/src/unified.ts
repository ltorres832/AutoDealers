// Unificación de mensajes de todos los canales

import { MessagePayload, MessageResponse } from './types';
import { WhatsAppService } from './whatsapp';
import { EmailService } from './email';
import { SMSService } from './sms';

export class UnifiedMessagingService {
  private whatsappService?: WhatsAppService;

  constructor(whatsappService?: WhatsAppService) {
    this.whatsappService = whatsappService;
  }

  /**
   * Envía un mensaje por el canal especificado
   */
  async sendMessage(payload: MessagePayload): Promise<MessageResponse> {
    let response: MessageResponse;

    switch (payload.channel) {
      case 'whatsapp':
        response = await this.sendWhatsApp(payload);
        break;
      case 'email':
        response = await this.sendEmail(payload);
        break;
      case 'sms':
        response = await this.sendSMS(payload);
        break;
      case 'facebook':
      case 'instagram':
        response = await this.sendSocialMessage(payload);
        break;
      default:
        throw new Error(`Unsupported channel: ${payload.channel}`);
    }

    if (response.status === 'sent' && payload.leadId) {
      const { createMessage } = await import('@autodealers/crm');
      await createMessage({
        tenantId: payload.tenantId,
        leadId: payload.leadId,
        channel: payload.channel,
        direction: payload.direction,
        from: payload.from,
        to: payload.to,
        content: payload.content,
        attachments: payload.attachments,
        status: response.status,
        aiGenerated: false,
        metadata: payload.metadata || {},
      });
    }

    return response;
  }

  private async sendWhatsApp(payload: MessagePayload): Promise<MessageResponse> {
    if (this.whatsappService) {
      return this.whatsappService.sendMessage(payload);
    }

    const { createWhatsAppServiceForTenant } = await import('@autodealers/core');
    const wa = await createWhatsAppServiceForTenant(payload.tenantId);
    if (!wa) {
      return { id: '', status: 'failed', error: 'WhatsApp not configured' };
    }

    return wa.service.sendMessage({
      ...payload,
      from: payload.from || wa.phoneNumberId,
    });
  }

  private async sendEmail(payload: MessagePayload): Promise<MessageResponse> {
    const { createEmailService } = await import('@autodealers/core');
    const configured = await createEmailService();
    if (!configured) {
      return { id: '', status: 'failed', error: 'Email not configured' };
    }

    return configured.service.sendEmail({
      ...payload,
      from: payload.from || configured.fromAddress,
    });
  }

  private async sendSMS(payload: MessagePayload): Promise<MessageResponse> {
    const { createSmsService } = await import('@autodealers/core');
    const sms = await createSmsService();
    if (!sms) {
      return { id: '', status: 'failed', error: 'Twilio not configured' };
    }

    return sms.sendSMS(payload);
  }

  /**
   * Envía mensaje a redes sociales (Meta Graph API — pendiente de unificar credenciales por tenant)
   */
  private async sendSocialMessage(payload: MessagePayload): Promise<MessageResponse> {
    console.warn(`Social outbound not implemented for channel ${payload.channel}`, payload.tenantId);
    return {
      id: '',
      status: 'failed',
      error: `Outbound ${payload.channel} not implemented`,
    };
  }

  /**
   * Obtiene todos los mensajes de un lead
   */
  async getLeadMessages(tenantId: string, leadId: string): Promise<any[]> {
    const { getLeadMessages } = await import('@autodealers/crm');
    return getLeadMessages(tenantId, leadId);
  }
}
