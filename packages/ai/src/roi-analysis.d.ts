/**
 * Calcula ROI de una campaña
 */
export declare function calculateCampaignROI(tenantId: string, campaignId: string, apiKey: string): Promise<{
    roi: number;
    totalSpent: number;
    totalRevenue: number;
    leadsGenerated: number;
    costPerLead: number;
    costPerSale: number;
    recommendations: string[];
} | null>;
/**
 * Analiza costo por lead
 */
export declare function analyzeCostPerLead(tenantId: string, apiKey: string): Promise<{
    averageCostPerLead: number;
    costBySource: Array<{
        source: string;
        cost: number;
        leads: number;
    }>;
    recommendations: string[];
} | null>;
/**
 * Optimiza inversión en marketing
 */
export declare function optimizeMarketingInvestment(tenantId: string, apiKey: string): Promise<{
    recommendedBudget: number;
    allocation: Array<{
        channel: string;
        percentage: number;
        budget: number;
        expectedROI: number;
    }>;
    reasoning: string;
} | null>;
/**
 * Predice retorno de inversión
 */
export declare function predictROI(tenantId: string, investmentAmount: number, channel: string, apiKey: string): Promise<{
    predictedROI: number;
    expectedRevenue: number;
    expectedLeads: number;
    confidence: number;
    reasoning: string;
} | null>;
//# sourceMappingURL=roi-analysis.d.ts.map