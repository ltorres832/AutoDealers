import { FeatureAction } from './feature-executor';
type MembershipFeatures = any;
export interface EnhancedFeatureCheckResult {
    allowed: boolean;
    reason?: string;
    limit?: number;
    current?: number;
    remaining?: number;
    isDynamic?: boolean;
    dynamicFeature?: any;
}
/**
 * Verifica si un tenant puede ejecutar una acción (incluye features dinámicas)
 */
export declare function canExecuteFeatureEnhanced(tenantId: string, action: FeatureAction | string): Promise<EnhancedFeatureCheckResult>;
/**
 * Obtiene todas las features disponibles (estándar + dinámicas) para un tenant
 */
export declare function getAllTenantFeatures(tenantId: string): Promise<{
    standard: MembershipFeatures;
    dynamic: Record<string, any>;
}>;
export {};
//# sourceMappingURL=feature-executor-enhanced.d.ts.map