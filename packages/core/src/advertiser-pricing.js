"use strict";
// Configuración de precios para advertisers (empresas externas)
// Sincronización automática con Stripe
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
exports.getAdvertiserPricingConfig = getAdvertiserPricingConfig;
exports.updateAdvertiserPricingConfig = updateAdvertiserPricingConfig;
exports.updateAdvertiserPlan = updateAdvertiserPlan;
exports.getStripePriceId = getStripePriceId;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization para evitar errores al importar el módulo
function getDb() {
    try {
        return (0, shared_1.getFirestore)();
    }
    catch (error) {
        console.error('Error inicializando Firestore:', error);
        throw new Error(`Firebase Admin no está configurado: ${error.message}`);
    }
}
// Inicializar Stripe dinámicamente desde Firestore
async function getStripe() {
    const { getStripeInstance } = await Promise.resolve().then(() => __importStar(require('./stripe-helper')));
    return await getStripeInstance();
}
const DEFAULT_CONFIG = {
    starter: {
        priceId: '',
        amount: 9900, // $99.00
        currency: 'usd',
        name: 'Starter',
        features: [
            '1 banner en sección patrocinadores',
            '10,000 impresiones/mes',
            'Dashboard básico',
            'Soporte por email',
        ],
    },
    professional: {
        priceId: '',
        amount: 29900, // $299.00
        currency: 'usd',
        name: 'Professional',
        features: [
            '2 banners (patrocinadores + sidebar)',
            '50,000 impresiones/mes',
            'Dashboard avanzado',
            'Soporte prioritario',
            'Targeting básico',
            'Métricas en tiempo real',
        ],
    },
    premium: {
        priceId: '',
        amount: 59900, // $599.00
        currency: 'usd',
        name: 'Premium',
        features: [
            'Banner en Hero (rotación)',
            'Impresiones ilimitadas',
            'Targeting avanzado',
            'A/B testing',
            'Métricas avanzadas',
            'Soporte 24/7',
        ],
    },
    updatedAt: new Date(),
    updatedBy: 'system',
};
/**
 * Obtiene la configuración de precios actual
 */
async function getAdvertiserPricingConfig() {
    try {
        const db = getDb();
        const doc = await getDb().collection('system').doc('advertiser_pricing').get();
        if (!doc.exists) {
            // Crear configuración por defecto
            try {
                const db = getDb();
                await getDb().collection('system').doc('advertiser_pricing').set({
                    ...DEFAULT_CONFIG,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch (setError) {
                // Si no se puede escribir, devolver configuración por defecto
                console.warn('No se pudo crear configuración en Firestore:', setError.message);
                return DEFAULT_CONFIG;
            }
            return DEFAULT_CONFIG;
        }
        const data = doc.data();
        return {
            ...DEFAULT_CONFIG,
            ...data,
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    }
    catch (error) {
        // Si hay un error al acceder a Firestore, devolver configuración por defecto
        console.error('Error al obtener configuración de precios:', error);
        console.warn('Devolviendo configuración por defecto');
        return DEFAULT_CONFIG;
    }
}
/**
 * Crea o actualiza un producto y precio en Stripe
 */
async function syncPlanWithStripe(planKey, planConfig, existingPriceId) {
    const stripe = await getStripe();
    // Buscar o crear producto
    let productId;
    const productName = `Anunciante ${planConfig.name} - AutoDealers`;
    // Buscar producto existente
    const products = await stripe.products.list({
        limit: 100,
    });
    const existingProduct = products.data.find((p) => p.name === productName && p.metadata?.plan === planKey);
    if (existingProduct) {
        productId = existingProduct.id;
        // Actualizar producto si es necesario
        await stripe.products.update(productId, {
            name: productName,
            description: planConfig.features.join('. '),
            metadata: {
                plan: planKey,
                type: 'advertiser',
            },
        });
    }
    else {
        // Crear nuevo producto
        const product = await stripe.products.create({
            name: productName,
            description: planConfig.features.join('. '),
            metadata: {
                plan: planKey,
                type: 'advertiser',
            },
        });
        productId = product.id;
    }
    // Si hay un precio existente, verificar si el monto cambió
    if (existingPriceId) {
        try {
            const existingPrice = await stripe.prices.retrieve(existingPriceId);
            // Si el monto es el mismo, usar el precio existente
            if (existingPrice.unit_amount === planConfig.amount && existingPrice.currency === planConfig.currency) {
                return existingPriceId;
            }
            // Si el monto cambió, desactivar el precio anterior y crear uno nuevo
            // (Stripe no permite modificar precios existentes)
            await stripe.prices.update(existingPriceId, {
                active: false,
            });
        }
        catch (error) {
            // El precio no existe, crear uno nuevo
            console.warn(`Precio ${existingPriceId} no encontrado, creando uno nuevo`);
        }
    }
    // Crear nuevo precio
    const price = await stripe.prices.create({
        product: productId,
        unit_amount: planConfig.amount,
        currency: planConfig.currency,
        recurring: {
            interval: 'month',
        },
        metadata: {
            plan: planKey,
            type: 'advertiser',
        },
    });
    return price.id;
}
/**
 * Actualiza la configuración de precios y sincroniza con Stripe
 */
async function updateAdvertiserPricingConfig(config, updatedBy) {
    const currentConfig = await getAdvertiserPricingConfig();
    const stripe = await getStripe();
    // Sincronizar cada plan con Stripe
    const updatedConfig = {
        ...currentConfig,
        ...config,
    };
    // Sincronizar starter
    if (config.starter) {
        try {
            updatedConfig.starter.priceId = await syncPlanWithStripe('starter', config.starter, currentConfig.starter.priceId);
        }
        catch (error) {
            console.error('Error sincronizando plan starter con Stripe:', error);
            throw new Error(`Error sincronizando plan Starter: ${error.message}`);
        }
    }
    // Sincronizar professional
    if (config.professional) {
        try {
            updatedConfig.professional.priceId = await syncPlanWithStripe('professional', config.professional, currentConfig.professional.priceId);
        }
        catch (error) {
            console.error('Error sincronizando plan professional con Stripe:', error);
            throw new Error(`Error sincronizando plan Professional: ${error.message}`);
        }
    }
    // Sincronizar premium
    if (config.premium) {
        try {
            updatedConfig.premium.priceId = await syncPlanWithStripe('premium', config.premium, currentConfig.premium.priceId);
        }
        catch (error) {
            console.error('Error sincronizando plan premium con Stripe:', error);
            throw new Error(`Error sincronizando plan Premium: ${error.message}`);
        }
    }
    // Guardar en Firestore
    const db = getDb();
    await getDb().collection('system').doc('advertiser_pricing').set({
        ...updatedConfig,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy,
    });
    return {
        ...updatedConfig,
        updatedAt: new Date(),
    };
}
/**
 * Actualiza un plan específico y sincroniza con Stripe
 */
async function updateAdvertiserPlan(plan, planConfig, updatedBy) {
    const currentConfig = await getAdvertiserPricingConfig();
    // Sincronizar con Stripe
    const priceId = await syncPlanWithStripe(plan, planConfig, currentConfig[plan].priceId);
    // Actualizar configuración
    const updatedConfig = {
        ...currentConfig,
        [plan]: {
            ...planConfig,
            priceId,
        },
    };
    return await updateAdvertiserPricingConfig(updatedConfig, updatedBy);
}
/**
 * Obtiene el Price ID de Stripe para un plan específico
 */
async function getStripePriceId(plan) {
    const config = await getAdvertiserPricingConfig();
    return config[plan].priceId || null;
}
