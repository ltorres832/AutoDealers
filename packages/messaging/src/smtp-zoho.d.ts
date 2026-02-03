import { MessagePayload, MessageResponse } from './types';
export interface ZohoSMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}
export declare class ZohoSMTPService {
    private config;
    constructor(config: ZohoSMTPConfig);
    /**
     * Envía un email usando SMTP de Zoho
     */
    sendEmail(payload: MessagePayload): Promise<MessageResponse>;
    /**
     * Crea configuración SMTP de Zoho desde variables de entorno
     */
    static fromEnvironment(): ZohoSMTPService | null;
}
//# sourceMappingURL=smtp-zoho.d.ts.map