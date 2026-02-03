/**
 * Registra una impresión y actualiza métricas mensuales
 */
export declare function recordMonthlyImpression(contentId: string, advertiserId: string): Promise<void>;
/**
 * Obtiene métricas mensuales de un contenido
 */
export declare function getMonthlyMetrics(contentId: string, month?: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
}>;
/**
 * Obtiene métricas mensuales totales de un anunciante
 */
export declare function getAdvertiserMonthlyMetrics(advertiserId: string, month?: string): Promise<{
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    averageCTR: number;
    campaigns: Array<{
        contentId: string;
        title: string;
        impressions: number;
        clicks: number;
        ctr: number;
    }>;
}>;
//# sourceMappingURL=advertiser-metrics.d.ts.map