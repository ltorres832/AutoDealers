export type AdObjective = 'more_messages' | 'more_visits' | 'more_engagement';
export interface AdCampaign {
    id: string;
    tenantId: string;
    userId: string;
    name: string;
    objective: AdObjective;
    vehicleId?: string;
    profileId?: string;
    budget: number;
    dailyBudget?: number;
    duration: number;
    platforms: ('facebook' | 'instagram')[];
    status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
    adSetId?: string;
    adId?: string;
    createdAt: Date;
    startedAt?: Date;
    endedAt?: Date;
    spent: number;
    impressions: number;
    clicks: number;
    messages: number;
    visits: number;
}
/**
 * Crea una campaña de ads
 */
export declare function createAdCampaign(campaign: Omit<AdCampaign, 'id' | 'createdAt' | 'spent' | 'impressions' | 'clicks' | 'messages' | 'visits'>): Promise<AdCampaign>;
/**
 * Inicia una campaña de ads en Meta
 */
export declare function startAdCampaign(tenantId: string, campaignId: string): Promise<{
    success: boolean;
    adSetId?: string;
    adId?: string;
    error?: string;
}>;
/**
 * Pausa una campaña de ads
 */
export declare function pauseAdCampaign(tenantId: string, campaignId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Obtiene campañas de ads de un tenant
 */
export declare function getAdCampaigns(tenantId: string, userId?: string): Promise<AdCampaign[]>;
//# sourceMappingURL=social-ads.d.ts.map