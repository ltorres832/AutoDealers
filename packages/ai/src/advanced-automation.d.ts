/**
 * Escala automáticamente leads críticos
 */
export declare function autoEscalateCriticalLeads(tenantId: string, apiKey: string): Promise<{
    escalatedLeads: Array<{
        leadId: string;
        reason: string;
        priority: 'high' | 'medium' | 'low';
    }>;
} | null>;
/**
 * Asigna automáticamente leads a vendedores
 */
export declare function autoAssignLeadsToSellers(tenantId: string, leadId: string, apiKey: string): Promise<{
    recommendedSellerId: string;
    reasoning: string;
    matchScore: number;
} | null>;
/**
 * Programa automáticamente seguimientos
 */
export declare function autoScheduleFollowups(tenantId: string, leadId: string, apiKey: string): Promise<{
    followups: Array<{
        scheduledDate: string;
        type: 'call' | 'email' | 'whatsapp' | 'visit';
        message: string;
        priority: 'high' | 'medium' | 'low';
    }>;
} | null>;
/**
 * Detecta automáticamente intención de compra
 */
export declare function detectPurchaseIntent(tenantId: string, leadId: string, apiKey: string): Promise<{
    intentScore: number;
    intentLevel: 'high' | 'medium' | 'low';
    signals: string[];
    recommendedAction: string;
} | null>;
//# sourceMappingURL=advanced-automation.d.ts.map