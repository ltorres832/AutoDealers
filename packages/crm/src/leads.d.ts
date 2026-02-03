import { Lead, LeadStatus, LeadSource } from './types';
/**
 * Crea un nuevo lead
 */
export declare function createLead(tenantId: string, source: LeadSource, contact: {
    name: string;
    email?: string;
    phone: string;
    preferredChannel: string;
}, notes?: string): Promise<Lead>;
/**
 * Obtiene un lead por ID
 */
export declare function getLeadById(tenantId: string, leadId: string): Promise<Lead | null>;
/**
 * Obtiene leads por tenant con filtros
 */
export declare function getLeads(tenantId: string, filters?: {
    status?: LeadStatus;
    assignedTo?: string;
    source?: LeadSource;
    limit?: number;
}): Promise<Lead[]>;
/**
 * Actualiza el estado de un lead
 */
export declare function updateLeadStatus(tenantId: string, leadId: string, status: LeadStatus): Promise<void>;
/**
 * Asigna un lead a un vendedor
 */
export declare function assignLead(tenantId: string, leadId: string, userId: string): Promise<void>;
/**
 * Agrega una interacción a un lead
 */
export declare function addInteraction(tenantId: string, leadId: string, interaction: {
    type: 'message' | 'call' | 'email' | 'note' | 'appointment';
    content: string;
    userId: string;
}): Promise<void>;
/**
 * Actualiza un lead
 */
export declare function updateLead(tenantId: string, leadId: string, updates: Partial<Lead>): Promise<void>;
/**
 * Busca un lead existente por teléfono (en cualquier tenant)
 * Útil para webhooks que no conocen el tenantId
 */
export declare function findLeadByPhone(phone: string): Promise<Lead | null>;
/**
 * Busca un lead por teléfono en un tenant específico
 */
export declare function findLeadByPhoneInTenant(tenantId: string, phone: string): Promise<Lead | null>;
//# sourceMappingURL=leads.d.ts.map