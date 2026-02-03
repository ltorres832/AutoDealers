export interface Advertiser {
    id: string;
    email: string;
    companyName: string;
    contactName: string;
    phone?: string;
    website?: string;
    industry: 'automotive' | 'insurance' | 'banking' | 'finance' | 'other';
    status: 'pending' | 'active' | 'suspended' | 'cancelled';
    plan: 'starter' | 'professional' | 'premium' | null;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    defaultPaymentMethod?: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
}
export interface SponsoredContent {
    id: string;
    advertiserId: string;
    advertiserName: string;
    campaignName?: string;
    type: 'banner' | 'promotion' | 'sponsor';
    placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';
    title: string;
    description: string;
    imageUrl: string;
    videoUrl?: string;
    linkUrl: string;
    linkType: 'external' | 'landing_page';
    targetLocation?: string[];
    targetVehicleTypes?: string[];
    budget: number;
    budgetType: 'monthly' | 'total';
    startDate: Date;
    endDate: Date;
    impressions: number;
    clicks: number;
    conversions: number;
    status: 'pending' | 'approved' | 'active' | 'paused' | 'expired' | 'rejected';
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    stripeSubscriptionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea un nuevo anunciante
 */
export declare function createAdvertiser(advertiserData: Omit<Advertiser, 'id' | 'createdAt' | 'updatedAt'>): Promise<Advertiser>;
/**
 * Obtiene un anunciante por ID
 */
export declare function getAdvertiserById(advertiserId: string): Promise<Advertiser | null>;
/**
 * Crea contenido patrocinado con validación de límites del plan
 */
export declare function createSponsoredContent(contentData: Omit<SponsoredContent, 'id' | 'createdAt' | 'updatedAt' | 'impressions' | 'clicks' | 'conversions'>): Promise<SponsoredContent>;
/**
 * Obtiene contenido patrocinado activo para mostrar públicamente
 */
export declare function getActiveSponsoredContent(placement?: SponsoredContent['placement'], limit?: number): Promise<SponsoredContent[]>;
/**
 * Actualiza métricas de contenido patrocinado con validación de límites
 */
export declare function updateSponsoredContentMetrics(contentId: string, type: 'impression' | 'click' | 'conversion'): Promise<{
    success: boolean;
    reason?: string;
}>;
/**
 * Obtiene contenido patrocinado de un anunciante
 */
export declare function getAdvertiserContent(advertiserId: string): Promise<SponsoredContent[]>;
//# sourceMappingURL=advertisers.d.ts.map