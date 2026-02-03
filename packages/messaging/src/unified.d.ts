import { MessagePayload, MessageResponse } from './types';
import { WhatsAppService } from './whatsapp';
export declare class UnifiedMessagingService {
    private whatsappService?;
    constructor(whatsappService?: WhatsAppService);
    /**
     * Envía un mensaje por el canal especificado
     */
    sendMessage(payload: MessagePayload): Promise<MessageResponse>;
    /**
     * Envía un email
     */
    private sendEmail;
    /**
     * Envía un SMS
     */
    private sendSMS;
    /**
     * Envía mensaje a redes sociales
     */
    private sendSocialMessage;
    /**
     * Obtiene todos los mensajes de un lead
     */
    getLeadMessages(tenantId: string, leadId: string): Promise<any[]>;
}
//# sourceMappingURL=unified.d.ts.map