export type TemplateType = 'email' | 'sms' | 'whatsapp';
export type TemplateEvent = 'subscription_created' | 'payment_success' | 'payment_failed' | 'payment_reminder_3days' | 'payment_reminder_5days' | 'account_suspended' | 'account_reactivated' | 'subscription_cancelled' | 'trial_ending' | 'invoice_generated' | 'advertiser_registered' | 'advertiser_ad_created' | 'advertiser_ad_approved' | 'advertiser_ad_rejected' | 'advertiser_ad_published' | 'advertiser_ad_payment_success' | 'advertiser_ad_payment_failed' | 'advertiser_payment_method_added' | 'advertiser_plan_upgraded' | 'advertiser_plan_downgraded' | 'custom';
export interface CommunicationTemplate {
    id: string;
    name: string;
    type: TemplateType;
    event: TemplateEvent;
    subject?: string;
    content: string;
    variables: string[];
    isActive: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
/**
 * Crea un nuevo template
 */
export declare function createTemplate(template: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, createdBy: string): Promise<CommunicationTemplate>;
/**
 * Obtiene todos los templates con filtros opcionales
 */
export declare function getTemplates(filters?: {
    type?: TemplateType;
    event?: TemplateEvent;
    isActive?: boolean;
}): Promise<CommunicationTemplate[]>;
/**
 * Obtiene un template por ID
 */
export declare function getTemplateById(templateId: string): Promise<CommunicationTemplate | null>;
/**
 * Obtiene el template activo para un evento específico
 */
export declare function getActiveTemplateForEvent(event: TemplateEvent, type: TemplateType): Promise<CommunicationTemplate | null>;
/**
 * Actualiza un template
 */
export declare function updateTemplate(templateId: string, updates: Partial<CommunicationTemplate>): Promise<void>;
/**
 * Elimina (desactiva) un template
 */
export declare function deleteTemplate(templateId: string): Promise<void>;
/**
 * Reemplaza variables en un template
 */
export declare function replaceTemplateVariables(template: CommunicationTemplate, variables: Record<string, string | number>): string;
/**
 * Reemplaza variables en el subject de un template
 */
export declare function replaceTemplateSubject(template: CommunicationTemplate, variables: Record<string, string | number>): string;
/**
 * Inicializa templates por defecto del sistema
 */
export declare function initializeDefaultTemplates(): Promise<void>;
//# sourceMappingURL=communication-templates.d.ts.map