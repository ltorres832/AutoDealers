import { MessagePayload, MessageResponse } from './types';
export declare class WhatsAppService {
    private accessToken;
    private phoneNumberId;
    constructor(accessToken: string, phoneNumberId: string);
    /**
     * Envía un mensaje de WhatsApp
     */
    sendMessage(payload: MessagePayload): Promise<MessageResponse>;
    /**
     * Procesa un webhook de WhatsApp
     */
    processWebhook(webhookData: any): Promise<MessagePayload | null>;
    /**
     * Verifica el webhook de WhatsApp
     */
    verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): string | null;
}
//# sourceMappingURL=whatsapp.d.ts.map