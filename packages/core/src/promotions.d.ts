export type PromotionType = 'discount' | 'special' | 'clearance' | 'seasonal';
export type PromotionStatus = 'active' | 'scheduled' | 'paused' | 'expired';
export type PromotionScope = 'vehicle' | 'dealer' | 'seller';
export interface Promotion {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    type: PromotionType;
    discount?: {
        type: 'percentage' | 'fixed';
        value: number;
    };
    applicableVehicles?: string[];
    applicableToAll: boolean;
    startDate: Date;
    endDate?: Date;
    status: PromotionStatus;
    autoSendToLeads: boolean;
    autoSendToCustomers: boolean;
    channels: ('email' | 'sms' | 'whatsapp')[];
    aiGenerated: boolean;
    isPaid?: boolean;
    isFreePromotion?: boolean;
    promotionScope?: PromotionScope;
    vehicleId?: string;
    price?: number;
    duration?: number;
    paymentId?: string;
    paidAt?: Date;
    expiresAt?: Date;
    views?: number;
    clicks?: number;
    priority?: number;
    socialMetrics?: {
        facebook?: {
            views?: number;
            clicks?: number;
            likes?: number;
            shares?: number;
            comments?: number;
            engagement?: number;
        };
        instagram?: {
            views?: number;
            clicks?: number;
            likes?: number;
            shares?: number;
            comments?: number;
            engagement?: number;
        };
    };
    socialPostIds?: {
        facebook?: string;
        instagram?: string;
    };
    isInternal?: boolean;
    createdByAdmin?: boolean;
    imageUrl?: string;
    placement?: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content' | 'promotions_section';
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una nueva promoción
 */
export declare function createPromotion(promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Promotion>;
/**
 * Obtiene promociones activas
 */
export declare function getActivePromotions(tenantId: string): Promise<Promotion[]>;
/**
 * Envía promoción a leads sin compra
 */
export declare function sendPromotionToLeads(tenantId: string, promotionId: string): Promise<void>;
/**
 * Obtiene promociones de un tenant
 */
export declare function getPromotions(tenantId: string, filters?: {
    status?: PromotionStatus;
    type?: PromotionType;
}): Promise<Promotion[]>;
//# sourceMappingURL=promotions.d.ts.map