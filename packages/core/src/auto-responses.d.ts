export interface AutoResponse {
    id: string;
    tenantId: string;
    name: string;
    trigger: {
        type: 'keyword' | 'question' | 'always';
        keywords?: string[];
        question?: string;
    };
    response: string;
    channels: ('whatsapp' | 'facebook' | 'instagram' | 'email' | 'sms')[];
    isActive: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una respuesta automática
 */
export declare function createAutoResponse(response: Omit<AutoResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutoResponse>;
/**
 * Obtiene respuestas automáticas activas
 */
export declare function getActiveAutoResponses(tenantId: string): Promise<AutoResponse[]>;
/**
 * Encuentra respuesta automática para un mensaje
 */
export declare function findAutoResponse(tenantId: string, message: string, channel: string): Promise<AutoResponse | null>;
//# sourceMappingURL=auto-responses.d.ts.map