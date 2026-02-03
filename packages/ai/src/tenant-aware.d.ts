import { LeadClassification, AIResponse } from './types';
/**
 * Clasifica un lead usando la configuración del tenant
 */
export declare function classifyLeadWithTenantConfig(tenantId: string, leadInfo: {
    name: string;
    phone: string;
    source: string;
    messages?: string[];
    interestedVehicles?: string[];
}): Promise<LeadClassification | null>;
/**
 * Genera una respuesta automática usando la configuración del tenant y el perfil expandido del negocio
 */
export declare function generateResponseWithTenantConfig(tenantId: string, context: string, message: string, leadHistory?: string[]): Promise<AIResponse | null>;
/**
 * Analiza el sentimiento de un mensaje usando la configuración del tenant
 */
export declare function analyzeSentimentWithTenantConfig(tenantId: string, message: string): Promise<'positive' | 'neutral' | 'negative' | null>;
/**
 * Sugiere seguimientos usando la configuración del tenant
 */
export declare function suggestFollowUpsWithTenantConfig(tenantId: string, leadStatus: string, lastInteraction: string): Promise<string[]>;
//# sourceMappingURL=tenant-aware.d.ts.map