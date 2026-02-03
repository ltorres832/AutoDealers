/**
 * Obtiene la membresía activa de un tenant
 */
export declare function getTenantMembership(tenantId: string): Promise<import("@autodealers/billing").Membership | null>;
/**
 * Verifica si un tenant tiene una feature específica
 */
export declare function tenantHasFeature(tenantId: string, feature: 'customSubdomain' | 'aiEnabled' | 'socialMediaEnabled' | 'marketplaceEnabled' | 'advancedReports'): Promise<boolean>;
/**
 * Verifica si un tenant puede realizar una acción según su membresía
 */
export declare function canPerformAction(tenantId: string, action: 'createSeller' | 'addVehicle' | 'useSubdomain' | 'useAI' | 'useSocialMedia' | 'useMarketplace' | 'viewAdvancedReports'): Promise<{
    allowed: boolean;
    reason?: string;
}>;
/**
 * Obtiene todas las features disponibles de un tenant
 */
export declare function getTenantFeatures(tenantId: string): Promise<{
    customSubdomain: boolean;
    aiEnabled: boolean;
    socialMediaEnabled: boolean;
    marketplaceEnabled: boolean;
    advancedReports: boolean;
    maxSellers: number | undefined;
    maxInventory: number | undefined;
}>;
//# sourceMappingURL=membership-validation.d.ts.map