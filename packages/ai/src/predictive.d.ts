/**
 * Predice la probabilidad de cierre de un lead
 */
export declare function predictLeadConversion(tenantId: string, leadId: string, apiKey: string): Promise<{
    conversionProbability: number;
    estimatedDaysToClose: number;
    confidence: number;
    factors: string[];
} | null>;
/**
 * Predice la demanda por tipo de vehículo
 */
export declare function predictVehicleDemand(tenantId: string, apiKey: string): Promise<{
    predictions: Array<{
        make: string;
        model: string;
        demandScore: number;
        estimatedSales: number;
        reasoning: string;
    }>;
} | null>;
/**
 * Predice la rotación de inventario
 */
export declare function predictInventoryTurnover(tenantId: string, vehicleId: string, apiKey: string): Promise<{
    estimatedDaysToSell: number;
    turnoverScore: number;
    reasoning: string;
} | null>;
//# sourceMappingURL=predictive.d.ts.map