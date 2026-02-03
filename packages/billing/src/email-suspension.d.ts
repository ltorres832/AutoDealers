/**
 * Suspende todos los emails corporativos de un tenant cuando expira su membresía
 */
export declare function suspendTenantCorporateEmails(tenantId: string): Promise<void>;
/**
 * Reactiva los emails corporativos de un tenant cuando se renueva la membresía
 */
export declare function reactivateTenantCorporateEmails(tenantId: string): Promise<void>;
/**
 * Verifica y suspende emails corporativos cuando expira una suscripción
 * Esta función debe llamarse cuando el estado de la suscripción cambia a 'suspended' o 'expired'
 */
export declare function checkAndSuspendEmailsOnSubscriptionChange(subscriptionId: string, newStatus: string): Promise<void>;
//# sourceMappingURL=email-suspension.d.ts.map