// Integración WhatsApp Business API

import { MessagePayload, MessageResponse } from './types';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  async sendMessage(payload: MessagePayload): Promise<MessageResponse> {
    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: payload.to,
            type: 'text',
            text: {
              body: payload.content,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send WhatsApp message');
      }

      return {
        id: data.messages[0].id,
        status: 'sent',
        externalId: data.messages[0].id,
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
   * Procesa un webhook de WhatsApp
   */
  async processWebhook(webhookData: any): Promise<MessagePayload | null> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return null;
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];

      return {
        tenantId: '', // Se debe extraer del número o configuración
        channel: 'whatsapp',
        direction: 'inbound',
        from: message.from,
        to: value.metadata?.phone_number_id || '',
        content: message.text?.body || '',
        metadata: {
          messageId: message.id,
          timestamp: message.timestamp,
          contactName: contact?.profile?.name,
        },
      };
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      return null;
    }
  }

  /**
   * Verifica el webhook de WhatsApp
   */
  verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }
}





