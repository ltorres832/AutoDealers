export type TemplateType = 'email' | 'sms' | 'whatsapp' | 'message';
export type TemplateRole = 'admin' | 'dealer' | 'seller' | 'all';
export interface Template {
    id: string;
    name: string;
    type: TemplateType;
    role: TemplateRole;
    category: string;
    subject?: string;
    content: string;
    variables: string[];
    isDefault: boolean;
    isEditable: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea un nuevo template
 */
export declare function createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>, tenantId?: string): Promise<Template>;
/**
 * Obtiene un template por ID
 */
export declare function getTemplateById(templateId: string): Promise<Template | null>;
/**
 * Obtiene templates por tipo y rol
 */
export declare function getTemplates(type?: TemplateType, role?: TemplateRole): Promise<Template[]>;
/**
 * Actualiza un template
 */
export declare function updateTemplate(templateId: string, updates: Partial<Template>): Promise<void>;
/**
 * Elimina un template
 */
export declare function deleteTemplate(templateId: string): Promise<void>;
/**
 * Procesa un template con variables
 */
export declare function processTemplate(template: Template, variables: Record<string, string>): {
    subject?: string;
    content: string;
};
/**
 * Obtiene template por defecto
 */
export declare function getDefaultTemplate(type: TemplateType, role: TemplateRole): Promise<Template | null>;
//# sourceMappingURL=templates.d.ts.map