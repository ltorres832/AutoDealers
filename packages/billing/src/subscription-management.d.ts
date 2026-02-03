import { Subscription, SubscriptionStatus } from './types';
/**
 * Obtiene todas las suscripciones con filtros opcionales
 */
export declare function getAllSubscriptions(filters?: {
    status?: SubscriptionStatus;
    tenantId?: string;
    membershipId?: string;
}): Promise<Subscription[]>;
/**
 * Obtiene una suscripción por ID
 */
export declare function getSubscriptionById(subscriptionId: string): Promise<Subscription | null>;
/**
 * Obtiene la suscripción activa de un tenant
 */
export declare function getSubscriptionByTenantId(tenantId: string): Promise<Subscription | null>;
/**
 * Actualiza el estado de una suscripción
 */
export declare function updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus, additionalData?: {
    daysPastDue?: number;
    suspendedAt?: Date;
    reactivatedAt?: Date;
    lastPaymentDate?: Date;
    nextPaymentDate?: Date;
    statusReason?: string;
}): Promise<void>;
/**
 * Suspende una cuenta automáticamente por falta de pago
 */
export declare function suspendAccountForNonPayment(subscriptionId: string): Promise<void>;
/**
 * Reactiva una cuenta después de un pago exitoso
 */
export declare function reactivateAccountAfterPayment(subscriptionId: string): Promise<void>;
/**
 * Cambia la membresía de una suscripción
 */
export declare function changeMembership(subscriptionId: string, newMembershipId: string, newPriceId: string): Promise<void>;
/**
 * Obtiene estadísticas de suscripciones
 */
export declare function getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    cancelled: number;
    pastDue: number;
}>;
//# sourceMappingURL=subscription-management.d.ts.map