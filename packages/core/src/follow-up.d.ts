export interface FollowUpCampaign {
    id: string;
    tenantId: string;
    name: string;
    targetLeads: {
        status: string[];
        daysSinceLastContact: number;
    };
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    usePromotions: boolean;
    customMessage?: string;
    isActive: boolean;
    lastRun?: Date;
    nextRun: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una campaña de seguimiento
 */
export declare function createFollowUpCampaign(campaign: Omit<FollowUpCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<FollowUpCampaign>;
/**
 * Ejecuta campañas de seguimiento pendientes
 */
export declare function runFollowUpCampaigns(): Promise<void>;
//# sourceMappingURL=follow-up.d.ts.map