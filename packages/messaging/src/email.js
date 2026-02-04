"use strict";
// Servicio de Email
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
exports.EmailService = void 0;
class EmailService {
    constructor(apiKey, provider = 'resend') {
        this.apiKey = apiKey;
        this.provider = provider;
    }
    /**
     * Envía un email
     */
    async sendEmail(payload) {
        if (this.provider === 'zoho_smtp') {
            return this.sendWithZohoSMTP(payload);
        }
        else if (this.provider === 'resend') {
            return this.sendWithResend(payload);
        }
        else {
            return this.sendWithSendGrid(payload);
        }
    }
    /**
     * Envía con Resend
     */
    async sendWithResend(payload) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'noreply@autodealers.com',
                    to: payload.to,
                    subject: payload.metadata?.subject || 'Mensaje de AutoDealers',
                    html: payload.content,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send email');
            }
            return {
                id: data.id,
                status: 'sent',
                externalId: data.id,
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
     * Envía con SendGrid
     */
    async sendWithSendGrid(payload) {
        // TODO: Implementar SendGrid
        return {
            id: '',
            status: 'sent',
        };
    }
    /**
     * Envía con Zoho SMTP
     */
    async sendWithZohoSMTP(payload) {
        try {
            const { ZohoSMTPService } = await Promise.resolve().then(() => __importStar(require('./smtp-zoho')));
            const smtpService = ZohoSMTPService.fromEnvironment();
            if (!smtpService) {
                throw new Error('Zoho SMTP not configured');
            }
            return await smtpService.sendEmail(payload);
        }
        catch (error) {
            return {
                id: '',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error sending email via Zoho SMTP',
            };
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=email.js.map