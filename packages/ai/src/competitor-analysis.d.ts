/**
 * Analiza precios de mercado y compara con competencia
 */
export declare function analyzeMarketPricing(tenantId: string, vehicleId: string, apiKey: string): Promise<{
    marketAverage: number;
    competitorRange: {
        min: number;
        max: number;
    };
    pricePosition: 'above' | 'at' | 'below';
    recommendation: string;
    competitivePrice: number;
} | null>;
/**
 * Identifica oportunidades de mercado
 */
export declare function identifyMarketOpportunities(tenantId: string, apiKey: string): Promise<{
    opportunities: Array<{
        type: string;
        description: string;
        potentialImpact: 'high' | 'medium' | 'low';
        actionItems: string[];
    }>;
} | null>;
/**
 * Analiza tendencias del sector
 */
export declare function analyzeIndustryTrends(tenantId: string, apiKey: string): Promise<{
    trends: Array<{
        category: string;
        trend: string;
        impact: 'high' | 'medium' | 'low';
        recommendation: string;
    }>;
} | null>;
//# sourceMappingURL=competitor-analysis.d.ts.map