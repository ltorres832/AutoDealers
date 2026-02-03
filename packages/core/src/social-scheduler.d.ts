export interface ScheduledPost {
    id: string;
    tenantId: string;
    userId: string;
    content: {
        text: string;
        imageUrl?: string;
        videoUrl?: string;
        hashtags: string[];
    };
    platforms: ('facebook' | 'instagram')[];
    scheduledFor: Date;
    publishedAt?: Date;
    status: 'scheduled' | 'published' | 'failed' | 'cancelled';
    postIds?: {
        facebook?: string;
        instagram?: string;
    };
    error?: string;
    aiGenerated: boolean;
    vehicleId?: string;
    promotionId?: string;
    createdAt: Date;
}
/**
 * Programa un post para publicarse más tarde
 */
export declare function schedulePost(post: Omit<ScheduledPost, 'id' | 'createdAt' | 'status' | 'publishedAt'>): Promise<ScheduledPost>;
/**
 * Publica un post programado
 */
export declare function publishScheduledPost(tenantId: string, postId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Pausa un post programado
 */
export declare function pauseScheduledPost(tenantId: string, postId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Reactiva un post pausado
 */
export declare function reactivateScheduledPost(tenantId: string, postId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Obtiene posts programados de un tenant
 */
export declare function getScheduledPosts(tenantId: string, userId?: string, status?: ScheduledPost['status']): Promise<ScheduledPost[]>;
//# sourceMappingURL=social-scheduler.d.ts.map