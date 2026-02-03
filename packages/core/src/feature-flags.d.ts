export type DashboardType = 'admin' | 'dealer' | 'seller' | 'public';
export interface FeatureConfig {
    id: string;
    dashboard: DashboardType;
    featureKey: string;
    featureName: string;
    enabled: boolean;
    description?: string;
    category?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface DashboardFeatures {
    dashboard: DashboardType;
    features: FeatureConfig[];
}
/**
 * Obtiene todas las configuraciones de features para un dashboard
 */
export declare function getDashboardFeatures(dashboard: DashboardType): Promise<FeatureConfig[]>;
/**
 * Obtiene todas las configuraciones de features para todos los dashboards
 */
export declare function getAllDashboardFeatures(): Promise<DashboardFeatures[]>;
/**
 * Verifica si una feature está habilitada para un dashboard
 */
export declare function isFeatureEnabled(dashboard: DashboardType, featureKey: string): Promise<boolean>;
/**
 * Actualiza el estado de una feature para un dashboard
 */
export declare function updateFeatureFlag(dashboard: DashboardType, featureKey: string, enabled: boolean, featureName?: string, description?: string, category?: string): Promise<FeatureConfig>;
/**
 * Inicializa las features por defecto para todos los dashboards
 */
export declare function initializeDefaultFeatures(): Promise<void>;
//# sourceMappingURL=feature-flags.d.ts.map