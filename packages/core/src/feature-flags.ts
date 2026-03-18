// Sistema de Feature Flags por Dashboard
// Permite habilitar/deshabilitar funciones específicas por dashboard

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

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
export async function getDashboardFeatures(dashboard: DashboardType): Promise<FeatureConfig[]> {
  const db = getDb();
  const snapshot = await db
    .collection('feature_flags')
    .where('dashboard', '==', dashboard)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as FeatureConfig[];
}

/**
 * Obtiene todas las configuraciones de features para todos los dashboards
 */
export async function getAllDashboardFeatures(): Promise<DashboardFeatures[]> {
  const dashboards: DashboardType[] = ['admin', 'dealer', 'seller', 'public'];
  const results: DashboardFeatures[] = [];

  for (const dashboard of dashboards) {
    const features = await getDashboardFeatures(dashboard);
    results.push({ dashboard, features });
  }

  return results;
}

/**
 * Verifica si una feature está habilitada para un dashboard
 */
export async function isFeatureEnabled(
  dashboard: DashboardType,
  featureKey: string
): Promise<boolean> {
  const db = getDb();
  const snapshot = await db
    .collection('feature_flags')
    .where('dashboard', '==', dashboard)
    .where('featureKey', '==', featureKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    // Por defecto, si no existe configuración, la feature está habilitada
    return true;
  }

  const config = snapshot.docs[0].data() as FeatureConfig;
  return config.enabled !== false;
}

/**
 * Actualiza el estado de una feature para un dashboard
 */
export async function updateFeatureFlag(
  dashboard: DashboardType,
  featureKey: string,
  enabled: boolean,
  featureName?: string,
  description?: string,
  category?: string
): Promise<FeatureConfig> {
  const db = getDb();
  const snapshot = await db
    .collection('feature_flags')
    .where('dashboard', '==', dashboard)
    .where('featureKey', '==', featureKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    // Crear nueva configuración
    const newConfigRef = getDb().collection('feature_flags').doc();
    const newConfig: Omit<FeatureConfig, 'id'> = {
      dashboard,
      featureKey,
      featureName: featureName || featureKey,
      enabled,
      description,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await newConfigRef.set({
      ...newConfig,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      id: newConfigRef.id,
      ...newConfig,
    };
  } else {
    // Actualizar configuración existente
    const configRef = snapshot.docs[0].ref;
    const updateData: any = {
      enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (featureName) updateData.featureName = featureName;
    if (description) updateData.description = description;
    if (category) updateData.category = category;

    await configRef.update(updateData);

    const updated = await configRef.get();
    return {
      id: updated.id,
      ...updated.data(),
      createdAt: updated.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
    } as FeatureConfig;
  }
}

/**
 * Inicializa las features por defecto para todos los dashboards
 */
export async function initializeDefaultFeatures(): Promise<void> {
  const defaultFeatures: Array<{
    dashboard: DashboardType;
    featureKey: string;
    featureName: string;
    description: string;
    category: string;
    enabled: boolean;
  }> = [
    // ========== ADMIN FEATURES ==========
    
    // Purchase Intent y Verificación
    { dashboard: 'admin', featureKey: 'purchase_intent', featureName: 'Purchase Intent', description: 'Sistema de Purchase Intent y verificación de ventas', category: 'Verificación', enabled: true },
    { dashboard: 'admin', featureKey: 'kpis', featureName: 'KPIs y Métricas', description: 'Dashboard de KPIs y métricas del sistema', category: 'Analítica', enabled: true },
    { dashboard: 'admin', featureKey: 'antifraud', featureName: 'Sistema Antifraude', description: 'Detección y prevención de fraude', category: 'Seguridad', enabled: true },
    { dashboard: 'admin', featureKey: 'earnings', featureName: 'Earnings', description: 'Sistema de earnings (solo admin)', category: 'Finanzas', enabled: true },
    { dashboard: 'admin', featureKey: 'system_settings', featureName: 'Configuración del Sistema', description: 'Configuración completa del sistema', category: 'Sistema', enabled: true },
    
    // F&I Features
    { dashboard: 'admin', featureKey: 'fi_calculator', featureName: 'Calculadora F&I', description: 'Calculadora de financiamiento', category: 'F&I', enabled: true },
    { dashboard: 'admin', featureKey: 'fi_scoring', featureName: 'Scoring F&I', description: 'Scoring automático de aprobación', category: 'F&I', enabled: true },
    { dashboard: 'admin', featureKey: 'fi_metrics', featureName: 'Métricas F&I', description: 'Dashboard de métricas F&I', category: 'F&I', enabled: true },
    { dashboard: 'admin', featureKey: 'fi_workflows', featureName: 'Workflows F&I', description: 'Workflows automatizados F&I', category: 'F&I', enabled: true },
    { dashboard: 'admin', featureKey: 'fi_cosigner', featureName: 'Co-signers', description: 'Gestión de co-signers', category: 'F&I', enabled: true },
    { dashboard: 'admin', featureKey: 'fi_comparison', featureName: 'Comparación Financiamiento', description: 'Comparación de opciones de financiamiento', category: 'F&I', enabled: true },
    { dashboard: 'admin', featureKey: 'fi_module', featureName: 'Módulo F&I Completo', description: 'Módulo completo de Financiamiento e Seguro', category: 'F&I', enabled: true },
    
    // CRM Features
    { dashboard: 'admin', featureKey: 'crm_kanban', featureName: 'Pipeline Kanban', description: 'Vista Kanban de leads', category: 'CRM', enabled: true },
    { dashboard: 'admin', featureKey: 'crm_tasks', featureName: 'Tareas', description: 'Gestión de tareas', category: 'CRM', enabled: true },
    { dashboard: 'admin', featureKey: 'crm_workflows', featureName: 'Workflows CRM', description: 'Workflows automatizados CRM', category: 'CRM', enabled: true },
    { dashboard: 'admin', featureKey: 'crm_reports', featureName: 'Reportes Avanzados', description: 'Reportes visuales avanzados', category: 'CRM', enabled: true },
    { dashboard: 'admin', featureKey: 'advanced_crm', featureName: 'CRM Avanzado', description: 'CRM con funcionalidades avanzadas', category: 'CRM', enabled: true },
    
    // ========== DEALER FEATURES ==========
    
    // Purchase y Verificación
    { dashboard: 'dealer', featureKey: 'certificates', featureName: 'Certificados de Compra', description: 'Certificados de compra con QR', category: 'Ventas', enabled: true },
    { dashboard: 'dealer', featureKey: 'roadside', featureName: 'Roadside Assistance', description: 'Roadside Assistance (Connect)', category: 'Servicios', enabled: true },
    { dashboard: 'dealer', featureKey: 'partners_insurance', featureName: 'Integración Seguros', description: 'Integración con seguros', category: 'Partners', enabled: true },
    { dashboard: 'dealer', featureKey: 'partners_banks', featureName: 'Integración Bancos', description: 'Integración con bancos', category: 'Partners', enabled: true },
    { dashboard: 'dealer', featureKey: 'customer_files', featureName: 'Archivo del Cliente', description: 'Archivo del cliente y documentos finales', category: 'Ventas', enabled: true },
    { dashboard: 'dealer', featureKey: 'contracts', featureName: 'Contratos y Firmas', description: 'Gestión de contratos y firmas digitales', category: 'Ventas', enabled: true },
    { dashboard: 'dealer', featureKey: 'contract_templates', featureName: 'Plantillas de Contratos', description: 'Plantillas de contratos', category: 'Ventas', enabled: true },
    
    // F&I Features
    { dashboard: 'dealer', featureKey: 'fi_calculator', featureName: 'Calculadora F&I', description: 'Calculadora de financiamiento', category: 'F&I', enabled: true },
    { dashboard: 'dealer', featureKey: 'fi_scoring', featureName: 'Scoring F&I', description: 'Scoring automático de aprobación', category: 'F&I', enabled: true },
    { dashboard: 'dealer', featureKey: 'fi_metrics', featureName: 'Métricas F&I', description: 'Dashboard de métricas F&I', category: 'F&I', enabled: true },
    { dashboard: 'dealer', featureKey: 'fi_workflows', featureName: 'Workflows F&I', description: 'Workflows automatizados F&I', category: 'F&I', enabled: true },
    { dashboard: 'dealer', featureKey: 'fi_cosigner', featureName: 'Co-signers', description: 'Gestión de co-signers', category: 'F&I', enabled: true },
    { dashboard: 'dealer', featureKey: 'fi_comparison', featureName: 'Comparación Financiamiento', description: 'Comparación de opciones de financiamiento', category: 'F&I', enabled: true },
    { dashboard: 'dealer', featureKey: 'fi_module', featureName: 'Módulo F&I Completo', description: 'Módulo completo de Financiamiento e Seguro', category: 'F&I', enabled: true },
    
    // CRM Features
    { dashboard: 'dealer', featureKey: 'crm_kanban', featureName: 'Pipeline Kanban', description: 'Vista Kanban de leads', category: 'CRM', enabled: true },
    { dashboard: 'dealer', featureKey: 'crm_tasks', featureName: 'Tareas', description: 'Gestión de tareas', category: 'CRM', enabled: true },
    { dashboard: 'dealer', featureKey: 'crm_workflows', featureName: 'Workflows CRM', description: 'Workflows automatizados CRM', category: 'CRM', enabled: true },
    { dashboard: 'dealer', featureKey: 'crm_reports', featureName: 'Reportes Avanzados', description: 'Reportes visuales avanzados', category: 'CRM', enabled: true },
    { dashboard: 'dealer', featureKey: 'advanced_crm', featureName: 'CRM Avanzado', description: 'CRM con funcionalidades avanzadas', category: 'CRM', enabled: true },
    
    // Otras Features
    { dashboard: 'dealer', featureKey: 'ai', featureName: 'Funcionalidades de IA', description: 'Funcionalidades de IA', category: 'IA', enabled: true },
    { dashboard: 'dealer', featureKey: 'messaging', featureName: 'Mensajería Omnicanal', description: 'Mensajería omnicanal', category: 'Comunicación', enabled: true },
    { dashboard: 'dealer', featureKey: 'inventory', featureName: 'Gestión de Inventario', description: 'Gestión de inventario', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'sales', featureName: 'Gestión de Ventas', description: 'Gestión de ventas', category: 'Ventas', enabled: true },
    { dashboard: 'dealer', featureKey: 'appointments', featureName: 'Sistema de Citas', description: 'Sistema de citas', category: 'Citas', enabled: true },
    { dashboard: 'dealer', featureKey: 'reports', featureName: 'Reportes y Análisis', description: 'Reportes y análisis', category: 'Reportes', enabled: true },
    
    // ========== SELLER FEATURES ==========
    
    // Purchase y Verificación
    { dashboard: 'seller', featureKey: 'certificates', featureName: 'Certificados de Compra', description: 'Certificados de compra con QR', category: 'Ventas', enabled: true },
    { dashboard: 'seller', featureKey: 'roadside', featureName: 'Roadside Assistance', description: 'Roadside Assistance (Connect)', category: 'Servicios', enabled: true },
    { dashboard: 'seller', featureKey: 'partners_insurance', featureName: 'Integración Seguros', description: 'Integración con seguros', category: 'Partners', enabled: true },
    { dashboard: 'seller', featureKey: 'partners_banks', featureName: 'Integración Bancos', description: 'Integración con bancos', category: 'Partners', enabled: true },
    { dashboard: 'seller', featureKey: 'customer_files', featureName: 'Archivo del Cliente', description: 'Archivo del cliente y documentos finales', category: 'Ventas', enabled: true },
    { dashboard: 'seller', featureKey: 'contracts', featureName: 'Contratos y Firmas', description: 'Gestión de contratos y firmas digitales', category: 'Ventas', enabled: true },
    { dashboard: 'seller', featureKey: 'contract_templates', featureName: 'Plantillas de Contratos', description: 'Plantillas de contratos', category: 'Ventas', enabled: true },
    
    // F&I Features
    { dashboard: 'seller', featureKey: 'fi_calculator', featureName: 'Calculadora F&I', description: 'Calculadora de financiamiento', category: 'F&I', enabled: true },
    { dashboard: 'seller', featureKey: 'fi_scoring', featureName: 'Scoring F&I', description: 'Scoring automático de aprobación', category: 'F&I', enabled: true },
    { dashboard: 'seller', featureKey: 'fi_cosigner', featureName: 'Co-signers', description: 'Gestión de co-signers', category: 'F&I', enabled: true },
    { dashboard: 'seller', featureKey: 'fi_module', featureName: 'Módulo F&I Completo', description: 'Módulo completo de Financiamiento e Seguro', category: 'F&I', enabled: true },
    
    // CRM Features
    { dashboard: 'seller', featureKey: 'crm_kanban', featureName: 'Pipeline Kanban', description: 'Vista Kanban de leads', category: 'CRM', enabled: true },
    { dashboard: 'seller', featureKey: 'crm_tasks', featureName: 'Tareas', description: 'Gestión de tareas', category: 'CRM', enabled: true },
    { dashboard: 'seller', featureKey: 'crm_workflows', featureName: 'Workflows CRM', description: 'Workflows automatizados CRM', category: 'CRM', enabled: true },
    { dashboard: 'seller', featureKey: 'crm_reports', featureName: 'Reportes Avanzados', description: 'Reportes visuales avanzados', category: 'CRM', enabled: true },
    { dashboard: 'seller', featureKey: 'advanced_crm', featureName: 'CRM Avanzado', description: 'CRM con funcionalidades avanzadas', category: 'CRM', enabled: true },
    
    // Otras Features
    { dashboard: 'seller', featureKey: 'ai', featureName: 'Funcionalidades de IA', description: 'Funcionalidades de IA', category: 'IA', enabled: true },
    { dashboard: 'seller', featureKey: 'messaging', featureName: 'Mensajería Omnicanal', description: 'Mensajería omnicanal', category: 'Comunicación', enabled: true },
    { dashboard: 'seller', featureKey: 'inventory', featureName: 'Gestión de Inventario', description: 'Gestión de inventario', category: 'Inventario', enabled: true },
    { dashboard: 'seller', featureKey: 'sales', featureName: 'Gestión de Ventas', description: 'Gestión de ventas', category: 'Ventas', enabled: true },
    { dashboard: 'seller', featureKey: 'appointments', featureName: 'Sistema de Citas', description: 'Sistema de citas', category: 'Citas', enabled: true },
    { dashboard: 'seller', featureKey: 'reports', featureName: 'Reportes y Análisis', description: 'Reportes y análisis', category: 'Reportes', enabled: true },
  ];

  console.log(`📝 Inicializando ${defaultFeatures.length} features por defecto...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const feature of defaultFeatures) {
    try {
      await updateFeatureFlag(
        feature.dashboard,
        feature.featureKey,
        feature.enabled,
        feature.featureName,
        feature.description,
        feature.category
      );
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`   ✅ ${successCount}/${defaultFeatures.length} features creadas...`);
      }
    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Error creando feature ${feature.featureKey} para ${feature.dashboard}:`, error.message);
    }
  }
  
  console.log(`✅ Inicialización completada: ${successCount} exitosas, ${errorCount} errores`);
  
  // Verificar que se guardaron correctamente
  const verification = await getAllDashboardFeatures();
  const totalFeatures = verification.reduce((sum, d) => sum + d.features.length, 0);
  console.log(`🔍 Verificación: ${totalFeatures} features encontradas en Firestore`);
  
  if (totalFeatures === 0) {
    throw new Error('No se guardaron features en Firestore. Verifica los permisos y la conexión.');
  }
}

