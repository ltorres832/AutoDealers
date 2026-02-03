type MembershipFeatures = any;
export type FeatureAction = 'createSeller' | 'addVehicle' | 'createCampaign' | 'createPromotion' | 'createLead' | 'createAppointment' | 'uploadFile' | 'makeApiCall' | 'useSubdomain' | 'useCustomDomain' | 'useAI' | 'useAutoResponse' | 'generateContent' | 'classifyLead' | 'useSocialMedia' | 'schedulePost' | 'viewSocialAnalytics' | 'useMarketplace' | 'featureInMarketplace' | 'viewAdvancedReports' | 'createCustomReport' | 'exportData' | 'useWhiteLabel' | 'useApi' | 'useWebhooks' | 'useSSO' | 'useMultiLanguage' | 'createTemplate' | 'sendEmailMarketing' | 'sendSMSMarketing' | 'sendWhatsAppMarketing' | 'uploadVideo' | 'createVirtualTour' | 'useLiveChat' | 'scheduleAppointment' | 'processPayment' | 'syncInventory' | 'useAdvancedCRM' | 'scoreLead' | 'createWorkflow' | 'addIntegration' | 'requestSupport' | 'requestTraining' | 'customizeBranding' | 'useMobileApp' | 'useOfflineMode' | 'requestBackup' | 'useComplianceTools' | 'viewAdvancedAnalytics' | 'runABTest' | 'useSEOTools' | 'createCustomIntegration' | 'publishFreePromotion';
export interface FeatureCheckResult {
    allowed: boolean;
    reason?: string;
    limit?: number;
    current?: number;
    remaining?: number;
}
/**
 * Verifica si un tenant puede ejecutar una acción específica
 */
export declare function canExecuteFeature(tenantId: string, action: FeatureAction): Promise<FeatureCheckResult>;
/**
 * Registra el uso de una feature (para tracking y límites)
 */
export declare function recordFeatureUsage(tenantId: string, action: FeatureAction, metadata?: Record<string, any>): Promise<void>;
/**
 * Obtiene el resumen de features disponibles para un tenant
 */
export declare function getTenantFeatureSummary(tenantId: string): Promise<{
    features: MembershipFeatures;
    usage: {
        sellers: {
            current: number;
            limit?: number;
        };
        vehicles: {
            current: number;
            limit?: number;
        };
        campaigns: {
            current: number;
            limit?: number;
        };
        promotions: {
            current: number;
            limit?: number;
        };
        storageGB: {
            current: number;
            limit?: number;
        };
        apiCalls: {
            current: number;
            limit?: number;
        };
    };
}>;
export {};
//# sourceMappingURL=feature-executor.d.ts.map