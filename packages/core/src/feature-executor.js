"use strict";
// Ejecutor de features - Valida y ejecuta features en tiempo real
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.canExecuteFeature = canExecuteFeature;
exports.recordFeatureUsage = recordFeatureUsage;
exports.getTenantFeatureSummary = getTenantFeatureSummary;
const membership_validation_1 = require("./membership-validation");
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Verifica si un tenant puede ejecutar una acción específica
 */
async function canExecuteFeature(tenantId, action) {
    const membership = await (0, membership_validation_1.getTenantMembership)(tenantId);
    if (!membership) {
        return {
            allowed: false,
            reason: 'No tiene membresía activa',
        };
    }
    // Verificar límites numéricos
    const numericLimitChecks = await checkNumericLimits(tenantId, action, membership.features);
    if (numericLimitChecks) {
        return numericLimitChecks;
    }
    // Verificar features booleanas
    const booleanFeatureChecks = checkBooleanFeatures(action, membership.features);
    if (booleanFeatureChecks) {
        return booleanFeatureChecks;
    }
    return { allowed: true };
}
/**
 * Verifica límites numéricos
 */
async function checkNumericLimits(tenantId, action, features) {
    switch (action) {
        case 'createSeller': {
            if (features.maxSellers === undefined || features.maxSellers === null) {
                return null; // Sin límite
            }
            const { getSubUsers } = await Promise.resolve().then(() => __importStar(require('./sub-users')));
            const sellers = await getSubUsers(tenantId);
            if (sellers.length >= features.maxSellers) {
                return {
                    allowed: false,
                    reason: `Límite de vendedores alcanzado`,
                    limit: features.maxSellers,
                    current: sellers.length,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: features.maxSellers,
                current: sellers.length,
                remaining: features.maxSellers - sellers.length,
            };
        }
        case 'addVehicle': {
            if (features.maxInventory === undefined || features.maxInventory === null) {
                return null; // Sin límite
            }
            const { getVehicles } = await Promise.resolve().then(() => __importStar(require('@autodealers/inventory')));
            const vehicles = await getVehicles(tenantId);
            if (vehicles.length >= features.maxInventory) {
                return {
                    allowed: false,
                    reason: `Límite de inventario alcanzado`,
                    limit: features.maxInventory,
                    current: vehicles.length,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: features.maxInventory,
                current: vehicles.length,
                remaining: features.maxInventory - vehicles.length,
            };
        }
        case 'createCampaign': {
            if (features.maxCampaigns === undefined || features.maxCampaigns === null) {
                return null;
            }
            const campaignsSnapshot = await getDb().collection('tenants')
                .doc(tenantId)
                .collection('campaigns')
                .get();
            if (campaignsSnapshot.size >= features.maxCampaigns) {
                return {
                    allowed: false,
                    reason: `Límite de campañas alcanzado`,
                    limit: features.maxCampaigns,
                    current: campaignsSnapshot.size,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: features.maxCampaigns,
                current: campaignsSnapshot.size,
                remaining: features.maxCampaigns - campaignsSnapshot.size,
            };
        }
        case 'createPromotion': {
            if (features.maxPromotions === undefined || features.maxPromotions === null) {
                return null;
            }
            const promotionsSnapshot = await getDb().collection('tenants')
                .doc(tenantId)
                .collection('promotions')
                .get();
            if (promotionsSnapshot.size >= features.maxPromotions) {
                return {
                    allowed: false,
                    reason: `Límite de promociones alcanzado`,
                    limit: features.maxPromotions,
                    current: promotionsSnapshot.size,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: features.maxPromotions,
                current: promotionsSnapshot.size,
                remaining: features.maxPromotions - promotionsSnapshot.size,
            };
        }
        case 'uploadFile': {
            if (features.maxStorageGB === undefined || features.maxStorageGB === null) {
                return null;
            }
            // Calcular almacenamiento actual (simplificado)
            const storageUsed = await calculateStorageUsed(tenantId);
            const maxBytes = features.maxStorageGB * 1024 * 1024 * 1024;
            if (storageUsed >= maxBytes) {
                return {
                    allowed: false,
                    reason: `Límite de almacenamiento alcanzado`,
                    limit: features.maxStorageGB,
                    current: Math.round(storageUsed / (1024 * 1024 * 1024) * 100) / 100,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: features.maxStorageGB,
                current: Math.round(storageUsed / (1024 * 1024 * 1024) * 100) / 100,
                remaining: features.maxStorageGB - Math.round(storageUsed / (1024 * 1024 * 1024) * 100) / 100,
            };
        }
        case 'makeApiCall': {
            if (features.maxApiCallsPerMonth === undefined || features.maxApiCallsPerMonth === null) {
                return null;
            }
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const apiCallsSnapshot = await getDb().collection('api_usage')
                .where('tenantId', '==', tenantId)
                .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(monthStart))
                .get();
            if (apiCallsSnapshot.size >= features.maxApiCallsPerMonth) {
                return {
                    allowed: false,
                    reason: `Límite de llamadas API del mes alcanzado`,
                    limit: features.maxApiCallsPerMonth,
                    current: apiCallsSnapshot.size,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: features.maxApiCallsPerMonth,
                current: apiCallsSnapshot.size,
                remaining: features.maxApiCallsPerMonth - apiCallsSnapshot.size,
            };
        }
        case 'createLead': {
            if (features.maxLeadsPerMonth === undefined || features.maxLeadsPerMonth === null) {
                return null;
            }
            const maxLeads = features.maxLeadsPerMonth;
            const { getLeads } = await Promise.resolve().then(() => __importStar(require('@autodealers/crm')));
            const leads = await getLeads(tenantId, { limit: 5000 });
            const start = new Date();
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            const countThisMonth = leads.filter((l) => l.createdAt >= start).length;
            if (countThisMonth >= maxLeads) {
                return {
                    allowed: false,
                    reason: `Has alcanzado el máximo de leads nuevos este mes para tu plan (${maxLeads}).`,
                    limit: maxLeads,
                    current: countThisMonth,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: maxLeads,
                current: countThisMonth,
                remaining: maxLeads - countThisMonth,
            };
        }
        case 'requestCustomerDocuments': {
            if (features.customerDocumentRequestsEnabled === false) {
                return {
                    allowed: false,
                    reason: 'Tu plan no incluye solicitudes de documentos al cliente en el expediente',
                };
            }
            const docLim = features.maxCustomerDocumentRequestsPerMonth;
            if (docLim === undefined || docLim === null) {
                return null;
            }
            const monthStartDoc = new Date();
            monthStartDoc.setDate(1);
            monthStartDoc.setHours(0, 0, 0, 0);
            const docUsageSnap = await getDb()
                .collection('feature_usage')
                .where('tenantId', '==', tenantId)
                .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(monthStartDoc))
                .get();
            const docCount = docUsageSnap.docs.filter((d) => d.data().action === 'requestCustomerDocuments').length;
            if (docCount >= docLim) {
                return {
                    allowed: false,
                    reason: `Límite mensual de solicitudes de documentos al cliente alcanzado`,
                    limit: docLim,
                    current: docCount,
                    remaining: 0,
                };
            }
            return {
                allowed: true,
                limit: docLim,
                current: docCount,
                remaining: docLim - docCount,
            };
        }
        default:
            return null;
    }
}
/**
 * Verifica features booleanas
 */
function checkBooleanFeatures(action, features) {
    const featureMap = {
        createSeller: 'maxSellers',
        addVehicle: 'maxInventory',
        createCampaign: 'maxCampaigns',
        createPromotion: 'maxPromotions',
        createAppointment: 'maxAppointmentsPerMonth',
        uploadFile: 'maxStorageGB',
        makeApiCall: 'maxApiCallsPerMonth',
        useSubdomain: 'customSubdomain',
        useCustomDomain: 'customDomain',
        useAI: 'aiEnabled',
        useAutoResponse: 'aiAutoResponses',
        generateContent: 'aiContentGeneration',
        classifyLead: 'aiLeadClassification',
        useSocialMedia: 'socialMediaEnabled',
        schedulePost: 'socialMediaScheduling',
        viewSocialAnalytics: 'socialMediaAnalytics',
        useMarketplace: 'marketplaceEnabled',
        featureInMarketplace: 'marketplaceFeatured',
        viewAdvancedReports: 'advancedReports',
        createCustomReport: 'customReports',
        exportData: 'exportData',
        useWhiteLabel: 'whiteLabel',
        useApi: 'apiAccess',
        useWebhooks: 'webhooks',
        useSSO: 'ssoEnabled',
        useMultiLanguage: 'multiLanguage',
        createTemplate: 'customTemplates',
        sendEmailMarketing: 'emailMarketing',
        sendSMSMarketing: 'smsMarketing',
        sendWhatsAppMarketing: 'whatsappMarketing',
        uploadVideo: 'videoUploads',
        createVirtualTour: 'virtualTours',
        useLiveChat: 'liveChat',
        scheduleAppointment: 'appointmentScheduling',
        processPayment: 'paymentProcessing',
        syncInventory: 'inventorySync',
        useAdvancedCRM: 'crmAdvanced',
        scoreLead: 'leadScoring',
        createWorkflow: 'automationWorkflows',
        addIntegration: 'integrationsUnlimited',
        requestSupport: 'prioritySupport',
        requestTraining: 'trainingSessions',
        customizeBranding: 'customBranding',
        useMobileApp: 'mobileApp',
        useOfflineMode: 'offlineMode',
        requestBackup: 'dataBackup',
        useComplianceTools: 'complianceTools',
        viewAdvancedAnalytics: 'analyticsAdvanced',
        runABTest: 'aBTesting',
        useSEOTools: 'seoTools',
        createCustomIntegration: 'customIntegrations',
        publishFreePromotion: 'freePromotionsOnLanding',
        useCorporateEmail: 'corporateEmailEnabled',
        useFIModule: 'fiModule',
    };
    const featureKey = featureMap[action];
    if (!featureKey) {
        return null; // No es una feature booleana
    }
    const featureValue = features[featureKey];
    if (typeof featureValue === 'boolean') {
        if (!featureValue) {
            return {
                allowed: false,
                reason: `La feature "${String(featureKey)}" no está incluida en su membresía`,
            };
        }
        return { allowed: true };
    }
    return null; // No es una feature booleana, se maneja en checkNumericLimits
}
/**
 * Calcula el almacenamiento usado por un tenant
 */
async function calculateStorageUsed(tenantId) {
    // Esto es una aproximación - en producción se calcularía desde Firebase Storage
    // Por ahora retornamos 0 para no bloquear
    return 0;
}
/**
 * Registra el uso de una feature (para tracking y límites)
 */
async function recordFeatureUsage(tenantId, action, metadata) {
    await getDb().collection('feature_usage').add({
        tenantId,
        action,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene el resumen de features disponibles para un tenant
 */
async function getTenantFeatureSummary(tenantId) {
    const membership = await (0, membership_validation_1.getTenantMembership)(tenantId);
    if (!membership) {
        throw new Error('No tiene membresía activa');
    }
    const { getSubUsers } = await Promise.resolve().then(() => __importStar(require('./sub-users')));
    const { getVehicles } = await Promise.resolve().then(() => __importStar(require('@autodealers/inventory')));
    const [sellers, vehicles, campaignsSnapshot, promotionsSnapshot] = await Promise.all([
        getSubUsers(tenantId),
        getVehicles(tenantId),
        getDb().collection('tenants').doc(tenantId).collection('campaigns').get(),
        getDb().collection('tenants').doc(tenantId).collection('promotions').get(),
    ]);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const apiCallsSnapshot = await getDb().collection('api_usage')
        .where('tenantId', '==', tenantId)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(monthStart))
        .get();
    return {
        features: membership.features,
        usage: {
            sellers: {
                current: sellers.length,
                limit: membership.features.maxSellers ?? undefined,
            },
            vehicles: {
                current: vehicles.length,
                limit: membership.features.maxInventory ?? undefined,
            },
            campaigns: {
                current: campaignsSnapshot.size,
                limit: membership.features.maxCampaigns ?? undefined,
            },
            promotions: {
                current: promotionsSnapshot.size,
                limit: membership.features.maxPromotions ?? undefined,
            },
            storageGB: {
                current: 0, // Se calcularía desde Storage
                limit: membership.features.maxStorageGB ?? undefined,
            },
            apiCalls: {
                current: apiCallsSnapshot.size,
                limit: membership.features.maxApiCallsPerMonth ?? undefined,
            },
        },
    };
}
