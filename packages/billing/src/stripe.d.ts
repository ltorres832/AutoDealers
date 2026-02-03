import Stripe from 'stripe';
export declare class StripeService {
    private stripe;
    constructor(secretKey: string);
    /**
     * Crea un cliente en Stripe
     */
    createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer>;
    /**
     * Crea una suscripción con soporte para tarjetas y ACH
     */
    createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>, taxRateId?: string): Promise<Stripe.Subscription>;
    /**
     * Cancela una suscripción
     */
    cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<Stripe.Subscription>;
    /**
     * Reactiva una suscripción cancelada
     */
    reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    /**
     * Obtiene los métodos de pago de un cliente
     */
    getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]>;
    /**
     * Procesa un webhook de Stripe
     */
    processWebhook(payload: string | Buffer, signature: string, webhookSecret: string): Promise<Stripe.Event>;
    /**
     * Crea un portal de cliente para gestión de suscripción
     */
    createCustomerPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;
    /**
     * Crea un Payment Intent para pagos únicos
     */
    createPaymentIntent(amount: number, currency?: string, description?: string, metadata?: Record<string, string>, customerId?: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent>;
    /**
     * Crea una sesión de Checkout para pagos únicos con soporte para tarjetas y ACH
     * Incluye automáticamente el tax del 11.5% si no se proporciona taxRateId
     */
    createCheckoutSession(amount: number, currency?: string, customerEmail?: string, customerId?: string, metadata?: Record<string, string>, successUrl?: string, cancelUrl?: string, taxRateId?: string): Promise<Stripe.Checkout.Session>;
    /**
     * Crea o obtiene un tax rate del 11.5%
     */
    getOrCreateTaxRate(): Promise<string>;
    /**
     * Crea una sesión de Checkout para suscripciones (con priceId)
     * Incluye automáticamente el tax del 11.5%
     */
    createSubscriptionCheckoutSession(params: {
        tenantId: string;
        priceId: string;
        successUrl?: string;
        cancelUrl?: string;
        metadata?: Record<string, string>;
        customerEmail?: string;
        customerId?: string;
    }): Promise<Stripe.Checkout.Session>;
}
//# sourceMappingURL=stripe.d.ts.map