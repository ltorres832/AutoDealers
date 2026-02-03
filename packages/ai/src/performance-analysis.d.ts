/**
 * Analiza rendimiento por vendedor
 */
export declare function analyzeSellerPerformance(tenantId: string, sellerId: string, apiKey: string): Promise<{
    performanceScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    comparison: {
        vsAverage: number;
        vsBest: number;
    };
} | null>;
/**
 * Identifica mejores prácticas
 */
export declare function identifyBestPractices(tenantId: string, apiKey: string): Promise<{
    practices: Array<{
        practice: string;
        impact: 'high' | 'medium' | 'low';
        evidence: string;
        recommendation: string;
    }>;
} | null>;
/**
 * Sugiere mejoras continuas
 */
export declare function suggestContinuousImprovements(tenantId: string, apiKey: string): Promise<{
    improvements: Array<{
        area: string;
        currentState: string;
        targetState: string;
        actionItems: string[];
        expectedImpact: 'high' | 'medium' | 'low';
        priority: number;
    }>;
} | null>;
/**
 * Benchmarking automático
 */
export declare function performAutoBenchmarking(tenantId: string, apiKey: string): Promise<{
    benchmarks: Array<{
        metric: string;
        yourValue: number;
        industryAverage: number;
        percentile: number;
        status: 'above' | 'at' | 'below';
    }>;
    overallScore: number;
    recommendations: string[];
} | null>;
//# sourceMappingURL=performance-analysis.d.ts.map