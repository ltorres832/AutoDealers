"use strict";
// Sistema de Feature Flags por Dashboard
// Permite habilitar/deshabilitar funciones específicas por dashboard
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
exports.getDashboardFeatures = getDashboardFeatures;
exports.getAllDashboardFeatures = getAllDashboardFeatures;
exports.isFeatureEnabled = isFeatureEnabled;
exports.updateFeatureFlag = updateFeatureFlag;
exports.initializeDefaultFeatures = initializeDefaultFeatures;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Obtiene todas las configuraciones de features para un dashboard
 */
async function getDashboardFeatures(dashboard) {
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
    }));
}
/**
 * Obtiene todas las configuraciones de features para todos los dashboards
 */
async function getAllDashboardFeatures() {
    const dashboards = ['admin', 'dealer', 'seller', 'public'];
    const results = [];
    for (const dashboard of dashboards) {
        const features = await getDashboardFeatures(dashboard);
        results.push({ dashboard, features });
    }
    return results;
}
/**
 * Verifica si una feature está habilitada para un dashboard
 */
async function isFeatureEnabled(dashboard, featureKey) {
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
    const config = snapshot.docs[0].data();
    return config.enabled !== false;
}
/**
 * Actualiza el estado de una feature para un dashboard
 */
async function updateFeatureFlag(dashboard, featureKey, enabled, featureName, description, category) {
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
        const newConfig = {
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
    }
    else {
        // Actualizar configuración existente
        const configRef = snapshot.docs[0].ref;
        const updateData = {
            enabled,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (featureName)
            updateData.featureName = featureName;
        if (description)
            updateData.description = description;
        if (category)
            updateData.category = category;
        await configRef.update(updateData);
        const updated = await configRef.get();
        return {
            id: updated.id,
            ...updated.data(),
            createdAt: updated.data()?.createdAt?.toDate() || new Date(),
            updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
        };
    }
}
/**
 * Inicializa las features por defecto para todos los dashboards
 */
async function initializeDefaultFeatures() {
    const defaultFeatures = [
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
            await updateFeatureFlag(feature.dashboard, feature.featureKey, feature.enabled, feature.featureName, feature.description, feature.category);
            successCount++;
            if (successCount % 10 === 0) {
                console.log(`   ✅ ${successCount}/${defaultFeatures.length} features creadas...`);
            }
        }
        catch (error) {
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
