import { CustomerFile, CustomerDocument, RequestedDocument, EvidenceItem } from './types';
/**
 * Crea un nuevo Customer File automáticamente cuando se completa una venta
 */
export declare function createCustomerFile(tenantId: string, saleId: string, customerId: string, customerInfo: CustomerFile['customerInfo'], vehicleId: string, sellerId: string, sellerInfo?: CustomerFile['sellerInfo']): Promise<CustomerFile>;
/**
 * Obtiene un Customer File por ID
 */
export declare function getCustomerFileById(tenantId: string, fileId: string): Promise<CustomerFile | null>;
/**
 * Obtiene un Customer File por token de subida
 */
export declare function getCustomerFileByToken(uploadToken: string): Promise<CustomerFile | null>;
/**
 * Obtiene todos los Customer Files de un tenant
 */
export declare function getCustomerFiles(tenantId: string, filters?: {
    customerId?: string;
    sellerId?: string;
    saleId?: string;
    status?: CustomerFile['status'];
}): Promise<CustomerFile[]>;
/**
 * Solicita un documento al cliente
 */
export declare function requestDocument(tenantId: string, fileId: string, documentName: string, documentType: string, description: string, required: boolean, requestedBy: string): Promise<RequestedDocument>;
/**
 * Agrega un documento subido por el cliente
 */
export declare function addCustomerDocument(tenantId: string, fileId: string, document: Omit<CustomerDocument, 'id' | 'uploadedAt'>): Promise<CustomerDocument>;
/**
 * Agrega un documento subido por el vendedor/dealer
 */
export declare function addDealerDocument(tenantId: string, fileId: string, document: Omit<CustomerDocument, 'id' | 'uploadedAt'>, uploadedBy: 'seller' | 'dealer'): Promise<CustomerDocument>;
/**
 * Agrega una evidencia al file
 */
export declare function addEvidence(tenantId: string, fileId: string, evidence: Omit<EvidenceItem, 'id' | 'createdAt'>): Promise<EvidenceItem>;
/**
 * Actualiza el estado del Customer File
 */
export declare function updateCustomerFileStatus(tenantId: string, fileId: string, status: CustomerFile['status']): Promise<void>;
/**
 * Elimina un Customer File (soft delete)
 */
export declare function deleteCustomerFile(tenantId: string, fileId: string, deletedBy: string): Promise<void>;
/**
 * Actualiza las notas del Customer File
 */
export declare function updateCustomerFileNotes(tenantId: string, fileId: string, notes: string): Promise<void>;
//# sourceMappingURL=customer-files.d.ts.map