export interface PricingConfig {
    promotions: {
        vehicle: {
            durations: number[];
            prices: Record<number, number>;
        };
        dealer: {
            durations: number[];
            prices: Record<number, number>;
        };
        seller: {
            durations: number[];
            prices: Record<number, number>;
        };
    };
    banners: {
        hero: {
            durations: number[];
            prices: Record<number, number>;
        };
        sidebar: {
            durations: number[];
            prices: Record<number, number>;
        };
        between_content: {
            durations: number[];
            prices: Record<number, number>;
        };
        sponsors_section: {
            durations: number[];
            prices: Record<number, number>;
        };
    };
    limits: {
        maxActivePromotions: number;
        maxActiveBanners: number;
    };
}
/**
 * Obtiene la configuración de precios desde Firestore
 */
export declare function getPricingConfig(): Promise<PricingConfig>;
/**
 * Obtiene el precio de una promoción
 */
export declare function getPromotionPrice(scope: 'vehicle' | 'dealer' | 'seller', duration: number): Promise<number>;
/**
 * Obtiene el precio de un banner según su placement
 */
export declare function getBannerPrice(placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section', duration: number): Promise<number>;
/**
 * Obtiene las duraciones disponibles para promociones
 */
export declare function getPromotionDurations(scope: 'vehicle' | 'dealer' | 'seller'): Promise<number[]>;
/**
 * Obtiene las duraciones disponibles para banners según su placement
 */
export declare function getBannerDurations(placement: 'hero' | 'sidebar' | 'between_content' | 'sponsors_section'): Promise<number[]>;
/**
 * Limpia el cache de configuración
 */
export declare function clearPricingConfigCache(): void;
//# sourceMappingURL=pricing-config.d.ts.map