import { Subscription } from './types';
import { StripeService } from './stripe';
export declare class SubscriptionService {
    private stripeService;
    constructor(stripeService: StripeService);
    /**
     * Crea una nueva suscripción
     */
    createSubscription(tenantId: string, userId: string, membershipId: string, customerEmail: string, customerName: string, priceId: string): Promise<Subscription>;
    /**
     * Actualiza el estado de una suscripción desde webhook
     */
    updateSubscriptionFromWebhook(stripeSubscriptionId: string, status: string, currentPeriodStart: number, currentPeriodEnd: number, cancelAtPeriodEnd?: boolean): Promise<void>;
    /**
     * Cancela una suscripción
     */
    cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<void>;
    /**
     * Mapea el estado de Stripe al estado interno
     */
    private mapStripeStatus;
    /**
     * Verifica si una suscripción está activa
     */
    isSubscriptionActive(subscription: Subscription): boolean;
    /**
     * Obtiene días restantes de suscripción
     */
    getDaysRemaining(subscription: Subscription): number;
}
//# sourceMappingURL=subscriptions.d.ts.map