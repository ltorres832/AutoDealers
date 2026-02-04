"use strict";
// Servicio SMTP Zoho Mail para envíos transaccionales
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoSMTPService = void 0;
class ZohoSMTPService {
    constructor(config) {
        this.config = config;
    }
    /**
     * Envía un email usando SMTP de Zoho
     */
    async sendEmail(payload) {
        try {
            // Usar nodemailer o similar para SMTP
            // Por ahora, usamos fetch con la API de Zoho Mail (más simple)
            // Nota: Para SMTP real, necesitaríamos nodemailer:
            // const nodemailer = require('nodemailer');
            // const transporter = nodemailer.createTransport({ ... });
            // await transporter.sendMail({ ... });
            // Por ahora, usamos la API de Zoho Mail (que es más confiable)
            // Pero configuramos el email desde como sistema@autodealers.com
            const response = await fetch('https://api.zoho.com/mail/v1/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.config.auth.pass}`, // Token en lugar de password
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: {
                        address: this.config.auth.user, // sistema@autodealers.com
                        name: 'AutoDealers',
                    },
                    to: [
                        {
                            address: payload.to,
                        },
                    ],
                    subject: payload.metadata?.subject || 'Mensaje de AutoDealers',
                    htmlbody: payload.content,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send email via Zoho SMTP');
            }
            return {
                id: data.data?.messageId || '',
                status: 'sent',
                externalId: data.data?.messageId || '',
            };
        }
        catch (error) {
            return {
                id: '',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error sending email via SMTP',
            };
        }
    }
    /**
     * Crea configuración SMTP de Zoho desde variables de entorno
     */
    static fromEnvironment() {
        const user = process.env.ZOHO_SMTP_USER || 'sistema@autodealers.com';
        const pass = process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_REFRESH_TOKEN; // Token o password
        if (!pass) {
            console.warn('Zoho SMTP credentials not configured');
            return null;
        }
        return new ZohoSMTPService({
            host: 'smtp.zoho.com',
            port: 587,
            secure: false, // TLS se habilita automáticamente en puerto 587
            auth: {
                user,
                pass,
            },
        });
    }
}
exports.ZohoSMTPService = ZohoSMTPService;
//# sourceMappingURL=smtp-zoho.js.map