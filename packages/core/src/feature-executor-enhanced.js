"use strict";
// Ejecutor de features mejorado - Incluye features dinámicas
Object.defineProperty(exports, "__esModule", { value: true });
exports.canExecuteFeatureEnhanced = canExecuteFeatureEnhanced;
exports.getAllTenantFeatures = getAllTenantFeatures;
const feature_executor_1 = require("./feature-executor");
const dynamic_features_1 = require("./dynamic-features");
const membership_validation_1 = require("./membership-validation");
/**
 * Verifica si un tenant puede ejecutar una acción (incluye features dinámicas)
 */
async function canExecuteFeatureEnhanced(tenantId, action // Permite acciones dinámicas
) {
    // Primero intentar con el sistema estándar
    if (isStandardAction(action)) {
        return await (0, feature_executor_1.canExecuteFeature)(tenantId, action);
    }
    // Si no es una acción estándar, buscar en features dinámicas
    const dynamicFeature = await (0, dynamic_features_1.getDynamicFeatureByKey)(action);
    if (!dynamicFeature) {
        return {
            allowed: false,
            reason: `Feature "${action}" no encontrada`,
            isDynamic: false,
        };
    }
    // Obtener membresía del tenant
    const membership = await (0, membership_validation_1.getTenantMembership)(tenantId);
    if (!membership) {
        return {
            allowed: false,
            reason: 'No tiene membresía activa',
            isDynamic: true,
            dynamicFeature,
        };
    }
    // Verificar si la feature está en la membresía
    const featureValue = membership.features[dynamicFeature.key];
    if (featureValue === undefined || featureValue === null) {
        return {
            allowed: false,
            reason: `La feature "${dynamicFeature.name}" no está incluida en su membresía`,
            isDynamic: true,
            dynamicFeature,
        };
    }
    // Validar según el tipo de feature
    const validation = (0, dynamic_features_1.validateDynamicFeatureValue)(dynamicFeature, featureValue);
    if (!validation.valid) {
        return {
            allowed: false,
            reason: validation.error,
            isDynamic: true,
            dynamicFeature,
        };
    }
    // Verificar según el tipo
    if (dynamicFeature.type === 'boolean') {
        if (!featureValue) {
            return {
                allowed: false,
                reason: `La feature "${dynamicFeature.name}" no está habilitada`,
                isDynamic: true,
                dynamicFeature,
            };
        }
        return {
            allowed: true,
            isDynamic: true,
            dynamicFeature,
        };
    }
    if (dynamicFeature.type === 'number') {
        // Para features numéricas, verificar límites si aplica
        // Por ahora, si tiene un valor > 0, está permitido
        if (featureValue <= 0) {
            return {
                allowed: false,
                reason: `La feature "${dynamicFeature.name}" tiene límite 0`,
                isDynamic: true,
                dynamicFeature,
                limit: featureValue,
            };
        }
        return {
            allowed: true,
            isDynamic: true,
            dynamicFeature,
            limit: featureValue,
        };
    }
    // Para string y select, si tiene valor, está permitido
    return {
        allowed: true,
        isDynamic: true,
        dynamicFeature,
    };
}
/**
 * Verifica si una acción es estándar o dinámica
 */
function isStandardAction(action) {
    const standardActions = [
        'createSeller', 'addVehicle', 'createCampaign', 'createPromotion',
        'createLead', 'createAppointment', 'uploadFile', 'makeApiCall',
        'useSubdomain', 'useCustomDomain', 'useAI', 'useAutoResponse',
        'generateContent', 'classifyLead', 'useSocialMedia', 'schedulePost',
        'viewSocialAnalytics', 'useMarketplace', 'featureInMarketplace',
        'viewAdvancedReports', 'createCustomReport', 'exportData',
        'useWhiteLabel', 'useApi', 'useWebhooks', 'useSSO', 'useMultiLanguage',
        'createTemplate', 'sendEmailMarketing', 'sendSMSMarketing',
        'sendWhatsAppMarketing', 'uploadVideo', 'createVirtualTour',
        'useLiveChat', 'scheduleAppointment', 'processPayment', 'syncInventory',
        'useAdvancedCRM', 'scoreLead', 'createWorkflow', 'addIntegration',
        'requestSupport', 'requestTraining', 'customizeBranding', 'useMobileApp',
        'useOfflineMode', 'requestBackup', 'useComplianceTools',
        'viewAdvancedAnalytics', 'runABTest', 'useSEOTools', 'createCustomIntegration',
        'publishFreePromotion', 'useCorporateEmail', 'requestCustomerDocuments', 'useFIModule',
    ];
    return standardActions.includes(action);
}
/**
 * Obtiene todas las features disponibles (estándar + dinámicas) para un tenant
 */
async function getAllTenantFeatures(tenantId) {
    const membership = await (0, membership_validation_1.getTenantMembership)(tenantId);
    if (!membership) {
        return {
            standard: {},
            dynamic: {},
        };
    }
    // Obtener features dinámicas activas
    const dynamicFeatures = await (0, dynamic_features_1.getDynamicFeatures)(undefined, true);
    const dynamicFeaturesMap = {};
    dynamicFeatures.forEach((feature) => {
        const value = membership.features[feature.key];
        if (value !== undefined) {
            dynamicFeaturesMap[feature.key] = {
                ...feature,
                value,
            };
        }
    });
    return {
        standard: membership.features,
        dynamic: dynamicFeaturesMap,
    };
}
