// Unificación de mensajes de todos los canales

import { MessagePayload, MessageResponse, MessageChannel } from './types';
import { WhatsAppService } from './whatsapp';
// Importación dinámica para evitar dependencias circulares
// import { createMessage, getMessageById } from '@autodealers/crm';

export class UnifiedMessagingService {
  private whatsappService?: WhatsAppService;

  constructor(whatsappService?: WhatsAppService) {
    this.whatsappService = whatsappService;
  }

  /**
   * Envía un mensaje por el canal especificado
   */
  async sendMessage(
    payload: MessagePayload
  ): Promise<MessageResponse> {
    let response: MessageResponse;

    switch (payload.channel) {
      case 'whatsapp':
        if (!this.whatsappService) {
          throw new Error('WhatsApp service not configured');
        }
        response = await this.whatsappService.sendMessage(payload);
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

    // Guardar en CRM (importación dinámica para evitar dependencias circulares)
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

  /**
   * Envía un email
   */
  private async sendEmail(payload: MessagePayload): Promise<MessageResponse> {
    // TODO: Implementar con SendGrid o Resend
    return {
      id: '',
      status: 'sent',
    };
  }

  /**
   * Envía un SMS
   */
  private async sendSMS(payload: MessagePayload): Promise<MessageResponse> {
    // TODO: Implementar con Twilio
    return {
      id: '',
      status: 'sent',
    };
  }

  /**
   * Envía mensaje a redes sociales
   */
  private async sendSocialMessage(
    payload: MessagePayload
  ): Promise<MessageResponse> {
    // TODO: Implementar con Meta Graph API
    return {
      id: '',
      status: 'sent',
    };
  }

  /**
   * Obtiene todos los mensajes de un lead
   */
  async getLeadMessages(
    tenantId: string,
    leadId: string
  ): Promise<any[]> {
    // TODO: Implementar consulta a Firestore
    return [];
  }
}

