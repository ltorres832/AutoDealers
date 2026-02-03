export interface Policy {
    id: string;
    type: 'privacy' | 'terms' | 'refund' | 'shipping' | 'warranty' | 'data_protection' | 'cookie' | 'disclaimer' | 'custom';
    title: string;
    content: string;
    version: string;
    language: 'es' | 'en';
    isActive: boolean;
    isRequired: boolean;
    requiresAcceptance: boolean;
    applicableTo: ('admin' | 'dealer' | 'seller' | 'public' | 'advertiser')[];
    tenantId?: string;
    effectiveDate: Date;
    expirationDate?: Date;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy?: string;
}
export interface UserPolicyAcceptance {
    id: string;
    userId: string;
    policyId: string;
    policyVersion: string;
    acceptedAt: Date;
    ipAddress?: string;
    userAgent?: string;
}
/**
 * Crea una nueva política
 */
export declare function createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy>;
/**
 * Obtiene todas las políticas activas para un tipo y rol específicos
 */
export declare function getActivePolicies(type: Policy['type'], role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser', tenantId?: string, language?: 'es' | 'en'): Promise<Policy[]>;
/**
 * Obtiene todas las políticas requeridas que el usuario aún no ha aceptado
 */
export declare function getRequiredPoliciesForUser(userId: string, role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser', tenantId?: string, language?: 'es' | 'en'): Promise<Policy[]>;
/**
 * Registra la aceptación de una política por un usuario
 */
export declare function acceptPolicy(userId: string, policyId: string, ipAddress?: string, userAgent?: string): Promise<UserPolicyAcceptance>;
/**
 * Verifica si un usuario ha aceptado una política específica
 */
export declare function hasUserAcceptedPolicy(userId: string, policyId: string, version?: string): Promise<boolean>;
/**
 * Obtiene todas las políticas (para admin)
 */
export declare function getAllPolicies(tenantId?: string, language?: 'es' | 'en'): Promise<Policy[]>;
/**
 * Actualiza una política
 */
export declare function updatePolicy(policyId: string, updates: Partial<Policy>): Promise<Policy>;
/**
 * Elimina una política (soft delete)
 */
export declare function deletePolicy(policyId: string): Promise<void>;
//# sourceMappingURL=policies.d.ts.map