// Ejecutor de features - Valida y ejecuta features en tiempo real

import { getTenantMembership } from './membership-validation';

// Tipos - usar any para evitar dependencia circular en package.json
// Los tipos reales se obtienen en tiempo de ejecución
type MembershipFeatures = any;
type Membership = any;
import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

export type FeatureAction = 
  | 'createSeller'
  | 'addVehicle'
  | 'createCampaign'
  | 'createPromotion'
  | 'createLead'
  | 'createAppointment'
  | 'uploadFile'
  | 'makeApiCall'
  | 'useSubdomain'
  | 'useCustomDomain'
  | 'useAI'
  | 'useAutoResponse'
  | 'generateContent'
  | 'classifyLead'
  | 'useSocialMedia'
  | 'schedulePost'
  | 'viewSocialAnalytics'
  | 'useMarketplace'
  | 'featureInMarketplace'
  | 'viewAdvancedReports'
  | 'createCustomReport'
  | 'exportData'
  | 'useWhiteLabel'
  | 'useApi'
  | 'useWebhooks'
  | 'useSSO'
  | 'useMultiLanguage'
  | 'createTemplate'
  | 'sendEmailMarketing'
  | 'sendSMSMarketing'
  | 'sendWhatsAppMarketing'
  | 'uploadVideo'
  | 'createVirtualTour'
  | 'useLiveChat'
  | 'scheduleAppointment'
  | 'processPayment'
  | 'syncInventory'
  | 'useAdvancedCRM'
  | 'scoreLead'
  | 'createWorkflow'
  | 'addIntegration'
  | 'requestSupport'
  | 'requestTraining'
  | 'customizeBranding'
  | 'useMobileApp'
  | 'useOfflineMode'
  | 'requestBackup'
  | 'useComplianceTools'
  | 'viewAdvancedAnalytics'
  | 'runABTest'
  | 'useSEOTools'
  | 'createCustomIntegration'
  | 'publishFreePromotion';

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
export async function canExecuteFeature(
  tenantId: string,
  action: FeatureAction
): Promise<FeatureCheckResult> {
  const membership = await getTenantMembership(tenantId);
  
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
async function checkNumericLimits(
  tenantId: string,
  action: FeatureAction,
  features: MembershipFeatures
): Promise<FeatureCheckResult | null> {
  switch (action) {
    case 'createSeller': {
      if (features.maxSellers === undefined || features.maxSellers === null) {
        return null; // Sin límite
      }
      const { getSubUsers } = await import('./sub-users');
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
      const { getVehicles } = await import('@autodealers/inventory');
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

    default:
      return null;
  }
}

/**
 * Verifica features booleanas
 */
function checkBooleanFeatures(
  action: FeatureAction,
  features: MembershipFeatures
): FeatureCheckResult | null {
  const featureMap: Record<FeatureAction, keyof MembershipFeatures | 'maxLeadsPerMonth'> = {
    createSeller: 'maxSellers',
    addVehicle: 'maxInventory',
    createCampaign: 'maxCampaigns',
    createPromotion: 'maxPromotions',
    createLead: 'maxLeadsPerMonth',
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
  };

  const featureKey = featureMap[action];
  if (!featureKey) {
    return null; // No es una feature booleana
  }

  const featureValue = (features as any)[featureKey];
  
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
async function calculateStorageUsed(tenantId: string): Promise<number> {
  // Esto es una aproximación - en producción se calcularía desde Firebase Storage
  // Por ahora retornamos 0 para no bloquear
  return 0;
}

/**
 * Registra el uso de una feature (para tracking y límites)
 */
export async function recordFeatureUsage(
  tenantId: string,
  action: FeatureAction,
  metadata?: Record<string, any>
): Promise<void> {
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
export async function getTenantFeatureSummary(tenantId: string): Promise<{
  features: MembershipFeatures;
  usage: {
    sellers: { current: number; limit?: number };
    vehicles: { current: number; limit?: number };
    campaigns: { current: number; limit?: number };
    promotions: { current: number; limit?: number };
    storageGB: { current: number; limit?: number };
    apiCalls: { current: number; limit?: number };
  };
}> {
  const membership = await getTenantMembership(tenantId);
  
  if (!membership) {
    throw new Error('No tiene membresía activa');
  }

  const { getSubUsers } = await import('./sub-users');
  const { getVehicles } = await import('@autodealers/inventory');
  
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




