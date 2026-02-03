import Stripe from 'stripe';
/**
 * Obtiene una instancia de Stripe usando las credenciales desde Firestore
 * Si no hay credenciales en Firestore, usa variables de entorno como fallback
 */
export declare function getStripeInstance(): Promise<Stripe>;
/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
export declare function getStripeWebhookSecretValue(): Promise<string>;
/**
 * Crea una instancia de StripeService usando credenciales desde Firestore
 * Compatible con el paquete @autodealers/billing
 */
export declare function getStripeService(): Promise<import("@autodealers/billing").StripeService>;
//# sourceMappingURL=stripe-helper.d.ts.map