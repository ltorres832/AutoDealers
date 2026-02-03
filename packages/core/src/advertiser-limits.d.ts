export interface PlanLimits {
    maxImpressionsPerMonth: number | null;
    maxBanners: number;
    allowedPlacements: ('hero' | 'sidebar' | 'sponsors_section' | 'between_content')[];
    hasAdvancedDashboard: boolean;
    hasAdvancedMetrics: boolean;
    hasBasicTargeting: boolean;
    hasAdvancedTargeting: boolean;
    hasABTesting: boolean;
}
export declare const PLAN_LIMITS: Record<'starter' | 'professional' | 'premium', PlanLimits>;
/**
 * Obtiene los límites del plan de un anunciante
 */
export declare function getAdvertiserPlanLimits(advertiserId: string): Promise<PlanLimits>;
/**
 * Verifica si un anunciante puede crear más banners
 */
export declare function canCreateBanner(advertiserId: string, placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'): Promise<{
    allowed: boolean;
    reason?: string;
}>;
/**
 * Verifica si un anunciante puede recibir más impresiones este mes
 */
export declare function canReceiveImpressions(advertiserId: string): Promise<{
    allowed: boolean;
    reason?: string;
    remaining?: number;
}>;
/**
 * Obtiene el uso actual de impresiones del mes
 */
export declare function getMonthlyImpressionsUsage(advertiserId: string): Promise<{
    used: number;
    limit: number | null;
    percentage: number;
    remaining: number | null;
}>;
/**
 * Verifica si una impresión puede ser registrada (antes de incrementar)
 */
export declare function checkAndIncrementImpression(contentId: string, advertiserId: string): Promise<{
    allowed: boolean;
    reason?: string;
}>;
//# sourceMappingURL=advertiser-limits.d.ts.map