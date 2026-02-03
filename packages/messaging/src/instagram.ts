// Integración Instagram Messaging

import { MessagePayload, MessageResponse } from './types';

export class InstagramMessagingService {
  private accessToken: string;
  private pageId: string;

  constructor(accessToken: string, pageId: string) {
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  /**
   * Envía un mensaje por Instagram DM
   */
  async sendMessage(payload: MessagePayload): Promise<MessageResponse> {
    try {
      // Instagram usa la misma API que Facebook pero con el endpoint de Instagram
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${payload.to}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: {
              id: payload.to,
            },
            message: {
              text: payload.content,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send Instagram message');
      }

      return {
        id: data.message_id,
        status: 'sent',
        externalId: data.message_id,
      };
    } catch (error) {
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}





