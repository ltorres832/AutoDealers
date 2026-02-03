import { MessagePayload, MessageResponse } from './types';
export declare class InstagramMessagingService {
    private accessToken;
    private pageId;
    constructor(accessToken: string, pageId: string);
    /**
     * Envía un mensaje por Instagram DM
     */
    sendMessage(payload: MessagePayload): Promise<MessageResponse>;
}
//# sourceMappingURL=instagram.d.ts.map