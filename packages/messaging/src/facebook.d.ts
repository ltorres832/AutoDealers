import { MessagePayload, MessageResponse } from './types';
export declare class FacebookMessengerService {
    private accessToken;
    private pageId;
    constructor(accessToken: string, pageId: string);
    /**
     * Envía un mensaje por Facebook Messenger
     */
    sendMessage(payload: MessagePayload): Promise<MessageResponse>;
    /**
     * Procesa un webhook de Facebook
     */
    processWebhook(webhookData: any): Promise<MessagePayload | null>;
}
//# sourceMappingURL=facebook.d.ts.map