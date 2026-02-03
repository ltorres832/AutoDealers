export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'tiktok';
export interface CampaignBudget {
    platform: CampaignPlatform;
    amount: number;
    currency: string;
    dailyLimit?: number;
}
export interface CampaignMetrics {
    impressions: number;
    clicks: number;
    engagements: number;
    leads: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpl: number;
}
export interface Campaign {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    type: 'promotion' | 'awareness' | 'conversion' | 'engagement';
    platforms: CampaignPlatform[];
    budgets: CampaignBudget[];
    content: {
        text: string;
        images?: string[];
        videos?: string[];
        callToAction?: string;
        link?: string;
    };
    targeting?: {
        ageRange?: {
            min: number;
            max: number;
        };
        genders?: string[];
        locations?: string[];
        interests?: string[];
    };
    schedule?: {
        startDate: Date;
        endDate?: Date;
        times?: string[];
    };
    status: CampaignStatus;
    aiGenerated: boolean;
    metrics?: CampaignMetrics;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
/**
 * Crea una nueva campaña
 */
export declare function createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign>;
/**
 * Obtiene campañas de un tenant
 */
export declare function getCampaigns(tenantId: string, filters?: {
    status?: CampaignStatus;
    platform?: CampaignPlatform;
    limit?: number;
}): Promise<Campaign[]>;
/**
 * Actualiza una campaña
 */
export declare function updateCampaign(tenantId: string, campaignId: string, updates: Partial<Campaign>): Promise<void>;
/**
 * Actualiza métricas de una campaña
 */
export declare function updateCampaignMetrics(tenantId: string, campaignId: string, metrics: Partial<CampaignMetrics>): Promise<void>;
/**
 * Inicia una campaña
 */
export declare function startCampaign(tenantId: string, campaignId: string): Promise<void>;
/**
 * Pausa una campaña
 */
export declare function pauseCampaign(tenantId: string, campaignId: string): Promise<void>;
//# sourceMappingURL=campaigns.d.ts.map