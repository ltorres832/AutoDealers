/**
 * Optimiza el presupuesto de una campaña
 */
export declare function optimizeCampaignBudget(tenantId: string, campaignId: string, apiKey: string): Promise<{
    suggestedBudget: number;
    dailyLimit: number;
    reasoning: string;
    expectedResults: {
        impressions: number;
        clicks: number;
        leads: number;
    };
} | null>;
/**
 * Sugiere audiencias objetivo para campañas
 */
export declare function suggestTargetAudience(tenantId: string, campaignType: string, apiKey: string): Promise<{
    demographics: {
        ageRange: {
            min: number;
            max: number;
        };
        genders: string[];
        locations: string[];
        interests: string[];
    };
    reasoning: string;
} | null>;
/**
 * Optimiza horarios de publicación para campañas
 */
export declare function optimizePostingSchedule(tenantId: string, platform: string, apiKey: string): Promise<{
    optimalTimes: string[];
    reasoning: string;
} | null>;
//# sourceMappingURL=campaign-optimization.d.ts.map