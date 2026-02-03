import { Lead } from './types';
export interface ScoringRule {
    id: string;
    tenantId: string;
    name: string;
    enabled: boolean;
    conditions: ScoringCondition[];
    points: number;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface ScoringCondition {
    field: 'source' | 'status' | 'interactions' | 'responseTime' | 'emailOpened' | 'linkClicked' | 'documentUploaded' | 'appointmentScheduled';
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
    value: any;
}
export interface ScoringConfig {
    tenantId: string;
    enabled: boolean;
    autoCalculate: boolean;
    manualOverride: boolean;
    maxScore: number;
    rules: ScoringRule[];
    weights?: {
        automatic: number;
        manual: number;
    };
    updatedAt: Date;
}
/**
 * Calcula el score automático de un lead
 */
export declare function calculateAutomaticScore(tenantId: string, lead: Lead): Promise<number>;
/**
 * Actualiza el score de un lead
 */
export declare function updateLeadScore(tenantId: string, leadId: string, automaticScore: number, manualScore?: number, reason?: string, updatedBy?: string): Promise<void>;
/**
 * Obtiene configuración de scoring
 */
export declare function getScoringConfig(tenantId: string): Promise<ScoringConfig>;
/**
 * Guarda configuración de scoring
 */
export declare function saveScoringConfig(tenantId: string, config: Partial<ScoringConfig>): Promise<void>;
//# sourceMappingURL=scoring.d.ts.map