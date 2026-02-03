export type FeatureType = 'boolean' | 'number' | 'string' | 'select';
export type FeatureCategory = 'domains' | 'ai' | 'social' | 'marketplace' | 'reports' | 'api' | 'marketing' | 'crm' | 'content' | 'services' | 'support' | 'custom';
export interface DynamicFeature {
    id: string;
    key: string;
    name: string;
    description: string;
    type: FeatureType;
    category: FeatureCategory;
    defaultValue?: boolean | number | string;
    options?: string[];
    min?: number;
    max?: number;
    unit?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
/**
 * Crea una nueva feature dinámica
 */
export declare function createDynamicFeature(feature: Omit<DynamicFeature, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, createdBy: string): Promise<DynamicFeature>;
/**
 * Obtiene todas las features dinámicas activas
 */
export declare function getDynamicFeatures(category?: FeatureCategory, activeOnly?: boolean): Promise<DynamicFeature[]>;
/**
 * Obtiene una feature dinámica por su clave
 */
export declare function getDynamicFeatureByKey(key: string): Promise<DynamicFeature | null>;
/**
 * Actualiza una feature dinámica
 */
export declare function updateDynamicFeature(featureId: string, updates: Partial<DynamicFeature>): Promise<void>;
/**
 * Elimina (desactiva) una feature dinámica
 */
export declare function deleteDynamicFeature(featureId: string): Promise<void>;
/**
 * Obtiene todas las features dinámicas y las convierte en un objeto para usar en membresías
 */
export declare function getDynamicFeaturesAsObject(): Promise<Record<string, any>>;
/**
 * Valida el valor de una feature dinámica según su tipo
 */
export declare function validateDynamicFeatureValue(feature: DynamicFeature, value: any): {
    valid: boolean;
    error?: string;
};
//# sourceMappingURL=dynamic-features.d.ts.map