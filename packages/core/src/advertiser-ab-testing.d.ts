export interface ABTestVariant {
    id: string;
    contentId: string;
    variantName: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    weight: number;
    impressions: number;
    clicks: number;
    conversions: number;
    isWinner?: boolean;
}
export interface ABTest {
    id: string;
    advertiserId: string;
    testName: string;
    variants: ABTestVariant[];
    status: 'active' | 'paused' | 'completed';
    startDate: Date;
    endDate?: Date;
    trafficSplit: 'equal' | 'weighted';
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea un test A/B para contenido patrocinado
 */
export declare function createABTest(advertiserId: string, testName: string, variants: Omit<ABTestVariant, 'id' | 'impressions' | 'clicks' | 'conversions'>[], trafficSplit?: 'equal' | 'weighted'): Promise<ABTest>;
/**
 * Selecciona una variante para mostrar según distribución de tráfico
 */
export declare function selectVariant(variants: ABTestVariant[], trafficSplit: 'equal' | 'weighted'): ABTestVariant;
/**
 * Obtiene el test A/B activo para un contenido
 */
export declare function getActiveABTestForContent(contentId: string): Promise<ABTest | null>;
/**
 * Actualiza métricas de una variante
 */
export declare function updateVariantMetrics(testId: string, variantId: string, type: 'impression' | 'click' | 'conversion'): Promise<void>;
/**
 * Determina el ganador del test A/B basado en CTR
 */
export declare function determineABTestWinner(testId: string): Promise<string | null>;
//# sourceMappingURL=advertiser-ab-testing.d.ts.map