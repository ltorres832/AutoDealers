import { CorporateEmail, CorporateEmailUsage } from '@autodealers/core';
/**
 * Crea un nuevo email corporativo
 */
export declare function createCorporateEmail(userId: string, tenantId: string, emailAlias: string, // Parte antes del @ (ej: "juan" para "juan@autocity.autoplataforma.com")
createdBy: 'user' | 'dealer', dealerId?: string): Promise<CorporateEmail>;
/**
 * Obtiene los emails corporativos de un usuario o tenant
 */
export declare function getCorporateEmails(userId?: string, tenantId?: string): Promise<CorporateEmail[]>;
/**
 * Suspende un email corporativo
 */
export declare function suspendCorporateEmail(emailId: string, tenantId: string): Promise<void>;
/**
 * Reactiva un email corporativo
 */
export declare function activateCorporateEmail(emailId: string, tenantId: string): Promise<void>;
/**
 * Elimina un email corporativo
 */
export declare function deleteCorporateEmail(emailId: string, tenantId: string): Promise<void>;
/**
 * Actualiza la firma de email
 */
export declare function updateEmailSignature(emailId: string, tenantId: string, signature: string, signatureType: 'basic' | 'advanced'): Promise<void>;
/**
 * Cambia la contraseña del email
 */
export declare function resetEmailPassword(emailId: string, tenantId: string, newPassword: string): Promise<void>;
/**
 * Obtiene el uso de emails corporativos para un tenant
 */
export declare function getCorporateEmailUsage(tenantId: string): Promise<CorporateEmailUsage>;
//# sourceMappingURL=corporate-email.d.ts.map