export interface ContractTemplate {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    type: 'purchase' | 'lease' | 'financing' | 'service' | 'warranty' | 'other';
    category: 'standard' | 'custom';
    templateDocumentUrl: string;
    fillableFields: Array<{
        id: string;
        name: string;
        type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'address' | 'signature';
        required: boolean;
        placeholder?: string;
        defaultValue?: string;
        position?: {
            x: number;
            y: number;
            width?: number;
            height?: number;
        };
    }>;
    signatureFields: Array<{
        id: string;
        type: 'signature' | 'initial' | 'date';
        signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
        required: boolean;
        label: string;
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una nueva plantilla de contrato
 */
export declare function createContractTemplate(tenantId: string, templateData: Omit<ContractTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ContractTemplate>;
/**
 * Obtiene todas las plantillas activas de un tenant
 */
export declare function getContractTemplates(tenantId: string, type?: string): Promise<ContractTemplate[]>;
/**
 * Obtiene una plantilla por ID
 */
export declare function getContractTemplateById(tenantId: string, templateId: string): Promise<ContractTemplate | null>;
/**
 * Genera un contrato desde una plantilla con datos llenados
 */
export declare function generateContractFromTemplate(tenantId: string, templateId: string, fieldValues: Record<string, any>, saleId?: string, leadId?: string, vehicleId?: string): Promise<{
    contractId: string;
    documentUrl: string;
}>;
//# sourceMappingURL=contract-templates.d.ts.map