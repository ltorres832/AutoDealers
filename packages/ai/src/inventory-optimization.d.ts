/**
 * Sugiere qué vehículos comprar
 */
export declare function suggestVehiclesToPurchase(tenantId: string, apiKey: string): Promise<{
    suggestions: Array<{
        make: string;
        model: string;
        year: number;
        priceRange: {
            min: number;
            max: number;
        };
        reasoning: string;
        expectedROI: number;
    }>;
} | null>;
/**
 * Analiza rentabilidad por vehículo
 */
export declare function analyzeVehicleProfitability(tenantId: string, vehicleId: string, apiKey: string): Promise<{
    profitabilityScore: number;
    profitMargin: number;
    daysToBreakEven: number;
    recommendations: string[];
} | null>;
/**
 * Optimiza el mix de inventario
 */
export declare function optimizeInventoryMix(tenantId: string, apiKey: string): Promise<{
    optimalMix: Array<{
        category: string;
        percentage: number;
        reasoning: string;
    }>;
    currentMix: Array<{
        category: string;
        percentage: number;
    }>;
    recommendations: string[];
} | null>;
/**
 * Predice demanda estacional
 */
export declare function predictSeasonalDemand(tenantId: string, apiKey: string): Promise<{
    seasonalTrends: Array<{
        month: string;
        expectedDemand: 'high' | 'medium' | 'low';
        recommendedInventory: number;
        reasoning: string;
    }>;
} | null>;
//# sourceMappingURL=inventory-optimization.d.ts.map