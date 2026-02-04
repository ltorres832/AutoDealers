"use strict";
// Unificación de mensajes de todos los canales
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedMessagingService = void 0;
// Importación dinámica para evitar dependencias circulares
// import { createMessage, getMessageById } from '@autodealers/crm';
class UnifiedMessagingService {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    /**
     * Envía un mensaje por el canal especificado
     */
    async sendMessage(payload) {
        let response;
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
            const { createMessage } = await Promise.resolve().then(() => __importStar(require('@autodealers/crm')));
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
    async sendEmail(payload) {
        // TODO: Implementar con SendGrid o Resend
        return {
            id: '',
            status: 'sent',
        };
    }
    /**
     * Envía un SMS
     */
    async sendSMS(payload) {
        // TODO: Implementar con Twilio
        return {
            id: '',
            status: 'sent',
        };
    }
    /**
     * Envía mensaje a redes sociales
     */
    async sendSocialMessage(payload) {
        // TODO: Implementar con Meta Graph API
        return {
            id: '',
            status: 'sent',
        };
    }
    /**
     * Obtiene todos los mensajes de un lead
     */
    async getLeadMessages(tenantId, leadId) {
        // TODO: Implementar consulta a Firestore
        return [];
    }
}
exports.UnifiedMessagingService = UnifiedMessagingService;
//# sourceMappingURL=unified.js.map