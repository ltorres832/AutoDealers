import { EmailAlias, Dealer, EmailAliasUsage } from '@autodealers/core';
/**
 * Crea un nuevo alias de email
 */
export declare function createEmailAlias(dealerId: string, alias: string, // Parte antes del @ (ej: "ventas")
assignedTo: string): Promise<EmailAlias>;
/**
 * Obtiene los aliases de un dealer
 */
export declare function getEmailAliases(dealerId?: string, assignedTo?: string): Promise<EmailAlias[]>;
/**
 * Obtiene un dealer por ID
 */
export declare function getDealerById(dealerId: string): Promise<Dealer | null>;
/**
 * Obtiene todos los dealers
 */
export declare function getAllDealers(filter?: {
    status?: 'active' | 'suspended' | 'cancelled' | 'pending';
    approvedByAdmin?: boolean;
}): Promise<Dealer[]>;
/**
 * Aprueba un dealer (admin)
 */
export declare function approveDealer(dealerId: string, approvedBy: string, // UID del admin
aliasesLimit?: number | null): Promise<void>;
/**
 * Rechaza o suspende un dealer
 */
export declare function rejectDealer(dealerId: string, reason?: string): Promise<void>;
/**
 * Suspende un alias de email
 */
export declare function suspendEmailAlias(aliasId: string): Promise<void>;
/**
 * Reactiva un alias de email
 */
export declare function activateEmailAlias(aliasId: string): Promise<void>;
/**
 * Elimina un alias de email
 */
export declare function deleteEmailAlias(aliasId: string): Promise<void>;
/**
 * Obtiene el uso de aliases para un dealer
 */
export declare function getEmailAliasUsage(dealerId: string): Promise<EmailAliasUsage>;
/**
 * Ajusta aliases automáticamente al cambiar membresía (upgrade/downgrade)
 */
export declare function adjustAliasesOnMembershipChange(dealerId: string, newMembershipId: string): Promise<{
    suspended: string[];
    allowed: number;
}>;
//# sourceMappingURL=email-aliases.d.ts.map