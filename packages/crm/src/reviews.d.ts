export interface Review {
    id: string;
    tenantId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    rating: number;
    title?: string;
    comment: string;
    photos?: string[];
    videos?: string[];
    vehicleId?: string;
    saleId?: string;
    status: 'pending' | 'approved' | 'rejected';
    featured: boolean;
    response?: {
        text: string;
        respondedBy: string;
        respondedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una nueva reseña
 */
export declare function createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review>;
/**
 * Obtiene todas las reseñas de un tenant
 */
export declare function getReviews(tenantId: string, filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    featured?: boolean;
    minRating?: number;
    limit?: number;
}): Promise<Review[]>;
/**
 * Obtiene reseñas aprobadas para mostrar públicamente
 */
export declare function getPublicReviews(tenantId: string, limit?: number): Promise<Review[]>;
/**
 * Obtiene una reseña por ID
 */
export declare function getReviewById(tenantId: string, reviewId: string): Promise<Review | null>;
/**
 * Actualiza una reseña
 */
export declare function updateReview(tenantId: string, reviewId: string, updates: Partial<Review>): Promise<void>;
/**
 * Elimina una reseña
 */
export declare function deleteReview(tenantId: string, reviewId: string): Promise<void>;
/**
 * Agrega una respuesta a una reseña
 */
export declare function addReviewResponse(tenantId: string, reviewId: string, responseText: string, respondedBy: string): Promise<void>;
/**
 * Obtiene estadísticas de reseñas
 */
export declare function getReviewStats(tenantId: string): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    averageRating: number;
    ratingDistribution: {
        [key: number]: number;
    };
}>;
//# sourceMappingURL=reviews.d.ts.map