export interface Contract {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    type: 'purchase' | 'lease' | 'financing' | 'service' | 'warranty' | 'other';
    templateId?: string;
    saleId?: string;
    leadId?: string;
    vehicleId?: string;
    fiRequestId?: string;
    originalDocumentUrl: string;
    digitalizedDocumentUrl?: string;
    finalDocumentUrl?: string;
    digitalization?: {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        extractedFields?: Record<string, any>;
        signatureFields?: Array<{
            id: string;
            type: 'signature' | 'initial' | 'date' | 'text';
            x: number;
            y: number;
            width: number;
            height: number;
            required: boolean;
            signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
            label?: string;
        }>;
        completedAt?: Date;
    };
    signatures: Array<{
        id: string;
        signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
        signerName: string;
        signerEmail?: string;
        signerPhone?: string;
        signatureType: 'in_person' | 'remote';
        status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
        signatureData?: string;
        signedAt?: Date;
        ipAddress?: string;
        userAgent?: string;
        token?: string;
        expiresAt?: Date;
    }>;
    status: 'draft' | 'pending_signatures' | 'partially_signed' | 'fully_signed' | 'completed' | 'cancelled';
    notificationsSent?: Array<{
        to: string;
        type: 'email' | 'sms' | 'whatsapp';
        sentAt: Date;
        status: 'sent' | 'delivered' | 'failed';
    }>;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
/**
 * Crea un nuevo contrato
 */
export declare function createContract(tenantId: string, contractData: Omit<Contract, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'signatures' | 'status'>): Promise<Contract>;
/**
 * Obtiene un contrato por ID
 */
export declare function getContractById(tenantId: string, contractId: string): Promise<Contract | null>;
/**
 * Obtiene contratos por saleId
 */
export declare function getContractsBySaleId(tenantId: string, saleId: string): Promise<Contract[]>;
/**
 * Actualiza el estado de digitalización de un contrato
 */
export declare function updateContractDigitalization(tenantId: string, contractId: string, digitalization: Contract['digitalization']): Promise<void>;
/**
 * Agrega una firma a un contrato
 */
export declare function addContractSignature(tenantId: string, contractId: string, signature: Contract['signatures'][0]): Promise<void>;
/**
 * Envía un contrato para firma remota
 */
export declare function sendContractForSignature(tenantId: string, contractId: string, signerId: string, signerEmail: string, signerName: string, signerPhone?: string): Promise<{
    token: string;
    url: string;
}>;
/**
 * Obtiene un contrato por token de firma
 */
export declare function getContractBySignatureToken(token: string): Promise<{
    contract: Contract;
    signature: Contract['signatures'][0];
} | null>;
/**
 * Marca una firma como completada
 */
export declare function completeContractSignature(tenantId: string, contractId: string, signatureId: string, signatureData: string, // Base64 de la firma
ipAddress?: string, userAgent?: string): Promise<void>;
//# sourceMappingURL=contracts.d.ts.map