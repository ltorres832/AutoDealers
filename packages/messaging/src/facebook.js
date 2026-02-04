"use strict";
// Integración Facebook Messenger
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookMessengerService = void 0;
class FacebookMessengerService {
    constructor(accessToken, pageId) {
        this.accessToken = accessToken;
        this.pageId = pageId;
    }
    /**
     * Envía un mensaje por Facebook Messenger
     */
    async sendMessage(payload) {
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/messages`, {
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
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to send Facebook message');
            }
            return {
                id: data.message_id,
                status: 'sent',
                externalId: data.message_id,
            };
        }
        catch (error) {
            return {
                id: '',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Procesa un webhook de Facebook
     */
    async processWebhook(webhookData) {
        try {
            const entry = webhookData.entry?.[0];
            const messaging = entry?.messaging?.[0];
            if (!messaging || !messaging.message) {
                return null;
            }
            return {
                tenantId: '', // Se debe extraer de la configuración
                channel: 'facebook',
                direction: 'inbound',
                from: messaging.sender.id,
                to: messaging.recipient.id,
                content: messaging.message.text || '',
                metadata: {
                    messageId: messaging.message.mid,
                    timestamp: messaging.timestamp,
                },
            };
        }
        catch (error) {
            console.error('Error processing Facebook webhook:', error);
            return null;
        }
    }
}
exports.FacebookMessengerService = FacebookMessengerService;
//# sourceMappingURL=facebook.js.map