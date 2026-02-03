export interface AdvertiserPricingConfig {
    starter: {
        priceId: string;
        amount: number;
        currency: string;
        name: string;
        features: string[];
    };
    professional: {
        priceId: string;
        amount: number;
        currency: string;
        name: string;
        features: string[];
    };
    premium: {
        priceId: string;
        amount: number;
        currency: string;
        name: string;
        features: string[];
    };
    updatedAt: Date;
    updatedBy: string;
}
/**
 * Obtiene la configuración de precios actual
 */
export declare function getAdvertiserPricingConfig(): Promise<AdvertiserPricingConfig>;
/**
 * Actualiza la configuración de precios y sincroniza con Stripe
 */
export declare function updateAdvertiserPricingConfig(config: Partial<AdvertiserPricingConfig>, updatedBy: string): Promise<AdvertiserPricingConfig>;
/**
 * Actualiza un plan específico y sincroniza con Stripe
 */
export declare function updateAdvertiserPlan(plan: 'starter' | 'professional' | 'premium', planConfig: {
    name: string;
    amount: number;
    currency: string;
    features: string[];
}, updatedBy: string): Promise<AdvertiserPricingConfig>;
/**
 * Obtiene el Price ID de Stripe para un plan específico
 */
export declare function getStripePriceId(plan: 'starter' | 'professional' | 'premium'): Promise<string | null>;
//# sourceMappingURL=advertiser-pricing.d.ts.map