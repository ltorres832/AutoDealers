/**
 * Personaliza mensajes según el perfil del cliente
 */
export declare function personalizeMessage(tenantId: string, leadId: string, messageType: 'greeting' | 'followup' | 'promotion' | 'closing', apiKey: string, customInstructions?: string): Promise<{
    personalizedMessage: string;
    tone: string;
    keyPoints: string[];
} | null>;
/**
 * Recomienda vehículos basado en historial del cliente
 */
export declare function recommendVehiclesByHistory(tenantId: string, leadId: string, apiKey: string): Promise<{
    recommendedVehicles: Array<{
        vehicleId: string;
        matchScore: number;
        reasoning: string;
    }>;
} | null>;
/**
 * Personaliza promociones según el perfil del cliente
 */
export declare function personalizePromotion(tenantId: string, leadId: string, promotionId: string, apiKey: string): Promise<{
    personalizedContent: string;
    discountSuggestion: number;
    reasoning: string;
} | null>;
//# sourceMappingURL=personalization.d.ts.map