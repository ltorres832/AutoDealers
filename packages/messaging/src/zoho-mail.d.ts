export interface ZohoEmailAccount {
    emailId: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    password: string;
    role: 'USER' | 'ADMIN';
    quota?: number;
}
export interface ZohoApiResponse {
    success: boolean;
    data?: any;
    error?: {
        code: string;
        message: string;
    };
}
export declare class ZohoMailService {
    private clientId;
    private clientSecret;
    private refreshToken;
    private accessToken?;
    private domain;
    private organizationId;
    constructor(clientId: string, clientSecret: string, refreshToken: string, domain: string, organizationId: string);
    /**
     * Obtiene un access token usando refresh token
     */
    private getAccessToken;
    /**
     * Crea un nuevo email account en Zoho Mail
     */
    createEmailAccount(account: ZohoEmailAccount): Promise<ZohoApiResponse>;
    /**
     * Suspende un email account en Zoho Mail
     */
    suspendEmailAccount(emailId: string): Promise<ZohoApiResponse>;
    /**
     * Reactiva un email account en Zoho Mail
     */
    activateEmailAccount(emailId: string): Promise<ZohoApiResponse>;
    /**
     * Elimina un email account en Zoho Mail
     */
    deleteEmailAccount(emailId: string): Promise<ZohoApiResponse>;
    /**
     * Cambia la contraseña de un email account
     */
    resetPassword(emailId: string, newPassword: string): Promise<ZohoApiResponse>;
    /**
     * Crea un alias de email
     */
    createEmailAlias(emailId: string, alias: string): Promise<ZohoApiResponse>;
}
//# sourceMappingURL=zoho-mail.d.ts.map