export interface Rating {
    id: string;
    tenantId: string;
    saleId: string;
    vehicleId: string;
    sellerId: string;
    dealerId?: string;
    customerEmail: string;
    customerName: string;
    sellerRating: number;
    dealerRating?: number;
    sellerComment?: string;
    dealerComment?: string;
    status: 'pending' | 'completed' | 'expired';
    surveyToken: string;
    createdAt: Date;
    completedAt?: Date;
    expiresAt: Date;
}
/**
 * Crea una nueva calificación pendiente cuando se marca un vehículo como vendido
 */
export declare function createPendingRating(tenantId: string, saleId: string, vehicleId: string, sellerId: string, dealerId: string | undefined, customerEmail: string, customerName: string): Promise<Rating>;
/**
 * Completa una calificación con las respuestas del cliente
 */
export declare function completeRating(tenantId: string, ratingId: string, sellerRating: number, dealerRating: number | undefined, sellerComment?: string, dealerComment?: string): Promise<void>;
/**
 * Obtiene una calificación por su token de encuesta
 */
export declare function getRatingByToken(surveyToken: string): Promise<Rating | null>;
/**
 * Obtiene el promedio de calificaciones de un usuario
 */
export declare function getUserRating(userId: string, userType: 'seller' | 'dealer'): Promise<{
    average: number;
    count: number;
}>;
//# sourceMappingURL=ratings.d.ts.map