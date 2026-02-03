import { MessagePayload, MessageResponse } from './types';
export declare class EmailService {
    private apiKey;
    private provider;
    constructor(apiKey: string, provider?: 'sendgrid' | 'resend');
    /**
     * Envía un email
     */
    sendEmail(payload: MessagePayload): Promise<MessageResponse>;
    /**
     * Envía con Resend
     */
    private sendWithResend;
    /**
     * Envía con SendGrid
     */
    private sendWithSendGrid;
    /**
     * Envía con Zoho SMTP
     */
    private sendWithZohoSMTP;
}
//# sourceMappingURL=email.d.ts.map