// Sistema de Feature Flags por Dashboard
// Permite habilitar/deshabilitar funciones específicas por dashboard

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export type DashboardType = 'admin' | 'dealer' | 'seller' | 'public' | 'business';

/** Flags de servicios automotrices: si no existen en Firestore, quedan apagados. */
export const AUTOMOTIVE_OPT_IN_FEATURE_KEYS = [
  'automotive_businesses_enabled',
  'services_public_section_enabled',
  'business_registration_enabled',
  'business_subscriptions_enabled',
  'business_social_enabled',
  'business_crm_enabled',
  'business_appointments_enabled',
  'business_estimates_enabled',
  'business_invoices_enabled',
  'autodealers_payments_enabled',
  'card_payments_enabled',
  'klarna_enabled',
  'affirm_enabled',
  'business_reviews_enabled',
  'business_products_enabled',
  'business_inventory_enabled',
  'my_garage_enabled',
  'vehicle_service_recommendations_enabled',
] as const;

export type AutomotiveOptInFeatureKey = (typeof AUTOMOTIVE_OPT_IN_FEATURE_KEYS)[number];

export function isAutomotiveOptInFeatureKey(featureKey: string): boolean {
  return (AUTOMOTIVE_OPT_IN_FEATURE_KEYS as readonly string[]).includes(featureKey);
}

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
  const dashboards: DashboardType[] = ['admin', 'dealer', 'seller', 'public', 'business'];
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
    // Flags de servicios automotrices: ausente = apagado (no aparecer en producción al desplegar).
    if (isAutomotiveOptInFeatureKey(featureKey)) {
      return false;
    }
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
    { dashboard: 'dealer', featureKey: 'compensation_portal', featureName: 'Mi Compensación', description: 'Ventas, comisiones, pagos y vacaciones del vendedor', category: 'RR.HH.', enabled: true },

    // Inventario competitivo (aditivo; no reemplaza inventario actual)
    { dashboard: 'dealer', featureKey: 'vin_camera_scan', featureName: 'Escaneo VIN (cámara)', description: 'Decodificar VIN (cámara o pegado) al crear vehículo', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'share_landing', featureName: 'Landing + QR para compartir', description: 'Landing + QR para compartir un vehículo', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'photo_guide', featureName: 'Guía de fotos', description: 'Ángulos guiados; original siempre se conserva', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'bg_remover', featureName: 'Quitar fondo (IA)', description: 'Generar versión editada sin borrar el original', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'dynamic_scenes', featureName: 'Escenas dinámicas', description: 'Fondos de estudio sobre la foto editada', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'dealer_site_builder', featureName: 'Constructor de sitio del dealer', description: 'Plantillas publicables sin tocar el marketplace', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'daco_labels', featureName: 'Etiquetas DACO + QR', description: 'Etiqueta imprimible con QR a la ficha', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'inventory_alliances', featureName: 'Alianzas de inventario', description: 'Compartir unidades con otro dealer aliado', category: 'Inventario', enabled: true },
    { dashboard: 'dealer', featureKey: 'inventory_feed_sync', featureName: 'Sync por feed URL', description: 'Importar CSV/JSON por URL sin borrar stock local', category: 'Inventario', enabled: true },
    
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
    { dashboard: 'seller', featureKey: 'compensation_portal', featureName: 'Mi Compensación', description: 'Ventas, comisiones, pagos y vacaciones', category: 'RR.HH.', enabled: true },

    { dashboard: 'seller', featureKey: 'vin_camera_scan', featureName: 'Escaneo VIN (cámara)', description: 'Decodificar VIN al crear vehículo', category: 'Inventario', enabled: true },
    { dashboard: 'seller', featureKey: 'share_landing', featureName: 'Landing + QR para compartir', description: 'Landing + QR para compartir un vehículo', category: 'Inventario', enabled: true },
    { dashboard: 'seller', featureKey: 'photo_guide', featureName: 'Guía de fotos', description: 'Ángulos guiados; original siempre se conserva', category: 'Inventario', enabled: true },
    { dashboard: 'seller', featureKey: 'bg_remover', featureName: 'Quitar fondo (IA)', description: 'Versión editada sin borrar el original', category: 'Inventario', enabled: true },
    { dashboard: 'seller', featureKey: 'dynamic_scenes', featureName: 'Escenas dinámicas', description: 'Fondos de estudio sobre la foto editada', category: 'Inventario', enabled: true },
    { dashboard: 'seller', featureKey: 'daco_labels', featureName: 'Etiquetas DACO + QR', description: 'Etiqueta imprimible con QR', category: 'Inventario', enabled: true },

    { dashboard: 'public', featureKey: 'automotive_businesses_enabled', featureName: 'Negocios automotrices', description: 'Directorio público de talleres y servicios', category: 'Servicios', enabled: false },
    { dashboard: 'public', featureKey: 'services_public_section_enabled', featureName: 'Sección servicios en homepage', description: 'Bloque Servicios para tu vehículo en el home', category: 'Servicios', enabled: false },
    { dashboard: 'public', featureKey: 'business_registration_enabled', featureName: 'Registro de negocios', description: 'Permitir auto-registro de negocios de servicios', category: 'Servicios', enabled: false },
    { dashboard: 'public', featureKey: 'my_garage_enabled', featureName: 'Mi garage', description: 'Garage opcional del comprador (sin cuenta obligatoria)', category: 'Servicios', enabled: false },
    { dashboard: 'public', featureKey: 'vehicle_service_recommendations_enabled', featureName: 'Sugerencias de servicios', description: 'Recomendar negocios reales según el vehículo', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'automotive_businesses_enabled', featureName: 'Portal de negocio', description: 'Dashboard de negocios automotrices', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_subscriptions_enabled', featureName: 'Membresías Business', description: 'Planes Essential / Pro / Premium', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_social_enabled', featureName: 'Social del negocio', description: 'Facebook / Instagram / WhatsApp del negocio', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_crm_enabled', featureName: 'CRM del negocio', description: 'Leads y pipeline del negocio de servicios', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_appointments_enabled', featureName: 'Citas del negocio', description: 'Agenda de citas de servicio', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_estimates_enabled', featureName: 'Estimados', description: 'Cotizaciones de servicio', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_invoices_enabled', featureName: 'Facturas de servicio', description: 'Facturación al cliente del negocio', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'autodealers_payments_enabled', featureName: 'AutoDealers Payments', description: 'Solicitud y cobros con Stripe Connect', category: 'Pagos', enabled: false },
    { dashboard: 'business', featureKey: 'card_payments_enabled', featureName: 'Pagos con tarjeta', description: 'Cobros con tarjeta (fee 3.5% configurable)', category: 'Pagos', enabled: false },
    { dashboard: 'business', featureKey: 'klarna_enabled', featureName: 'Klarna', description: 'BNPL Klarna en facturas (solo si el negocio tiene cobros activos)', category: 'Pagos', enabled: true },
    { dashboard: 'business', featureKey: 'affirm_enabled', featureName: 'Affirm', description: 'BNPL Affirm en facturas (solo si el negocio tiene cobros activos)', category: 'Pagos', enabled: true },
    { dashboard: 'business', featureKey: 'business_reviews_enabled', featureName: 'Reseñas del negocio', description: 'Reseñas públicas del negocio', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_products_enabled', featureName: 'Productos del negocio', description: 'Catálogo de productos (piezas, gomas, etc.)', category: 'Servicios', enabled: false },
    { dashboard: 'business', featureKey: 'business_inventory_enabled', featureName: 'Inventario de piezas', description: 'Inventario interno del negocio (no DMS dealer)', category: 'Servicios', enabled: false },
    { dashboard: 'admin', featureKey: 'automotive_businesses_enabled', featureName: 'Admin negocios automotrices', description: 'CRUD de categorías, negocios y solicitudes de pago', category: 'Servicios', enabled: false },
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

