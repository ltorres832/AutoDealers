/**
 * Sugiere vehículos para un lead basado en sus preferencias y mensajes
 */
export declare function suggestVehiclesForLead(tenantId: string, leadId: string): Promise<string[] | null>;
/**
 * Analiza una conversación completa y genera un resumen
 */
export declare function analyzeConversation(tenantId: string, leadId: string): Promise<{
    summary: string;
    keyPoints: string[];
    nextSteps: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
} | null>;
/**
 * Optimiza el precio de un vehículo basado en mercado y características
 */
export declare function optimizeVehiclePrice(tenantId: string, vehicleId: string): Promise<{
    suggestedPrice: number;
    reasoning: string;
    marketComparison: string;
} | null>;
/**
 * Genera un reporte inteligente con análisis de IA
 */
export declare function generateAIReport(tenantId: string, reportType: 'leads' | 'sales' | 'inventory' | 'performance', filters?: any): Promise<{
    summary: string;
    insights: string[];
    recommendations: string[];
    data: any;
} | null>;
/**
 * Analiza la satisfacción del cliente basado en interacciones
 */
export declare function analyzeCustomerSatisfaction(tenantId: string, leadId: string): Promise<{
    satisfactionScore: number;
    factors: string[];
    recommendations: string[];
} | null>;
/**
 * Optimiza horarios de citas basado en historial y preferencias
 */
export declare function optimizeAppointmentSchedule(tenantId: string, leadId: string, preferredDates: string[]): Promise<{
    suggestedTimes: string[];
    reasoning: string;
} | null>;
//# sourceMappingURL=advanced-features.d.ts.map