// Ejecutor de features mejorado - Incluye features dinámicas

import { canExecuteFeature, FeatureAction } from './feature-executor';
import { getDynamicFeatureByKey, getDynamicFeatures, validateDynamicFeatureValue } from './dynamic-features';
import { getTenantMembership } from './membership-validation';

// Tipo - usar any para evitar dependencia circular en package.json
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
export async function canExecuteFeatureEnhanced(
  tenantId: string,
  action: FeatureAction | string // Permite acciones dinámicas
): Promise<EnhancedFeatureCheckResult> {
  // Primero intentar con el sistema estándar
  if (isStandardAction(action)) {
    return await canExecuteFeature(tenantId, action as FeatureAction);
  }

  // Si no es una acción estándar, buscar en features dinámicas
  const dynamicFeature = await getDynamicFeatureByKey(action);
  
  if (!dynamicFeature) {
    return {
      allowed: false,
      reason: `Feature "${action}" no encontrada`,
      isDynamic: false,
    };
  }

  // Obtener membresía del tenant
  const membership = await getTenantMembership(tenantId);
  if (!membership) {
    return {
      allowed: false,
      reason: 'No tiene membresía activa',
      isDynamic: true,
      dynamicFeature,
    };
  }

  // Verificar si la feature está en la membresía
  const featureValue = (membership.features as any)[dynamicFeature.key];
  
  if (featureValue === undefined || featureValue === null) {
    return {
      allowed: false,
      reason: `La feature "${dynamicFeature.name}" no está incluida en su membresía`,
      isDynamic: true,
      dynamicFeature,
    };
  }

  // Validar según el tipo de feature
  const validation = validateDynamicFeatureValue(dynamicFeature, featureValue);
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
function isStandardAction(action: string): boolean {
  const standardActions: FeatureAction[] = [
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
  ];

  return standardActions.includes(action as FeatureAction);
}

/**
 * Obtiene todas las features disponibles (estándar + dinámicas) para un tenant
 */
export async function getAllTenantFeatures(tenantId: string): Promise<{
  standard: MembershipFeatures;
  dynamic: Record<string, any>;
}> {
  const membership = await getTenantMembership(tenantId);
  if (!membership) {
    return {
      standard: {} as MembershipFeatures,
      dynamic: {},
    };
  }

  // Obtener features dinámicas activas
  const dynamicFeatures = await getDynamicFeatures(undefined, true);
  const dynamicFeaturesMap: Record<string, any> = {};

  dynamicFeatures.forEach((feature) => {
    const value = (membership.features as any)[feature.key];
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





