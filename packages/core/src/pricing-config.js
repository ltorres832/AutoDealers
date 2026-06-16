"use strict";
// Utilidad para obtener configuración de precios
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPricingConfig = getPricingConfig;
exports.getPromotionPrice = getPromotionPrice;
exports.getBannerPrice = getBannerPrice;
exports.getPromotionDurations = getPromotionDurations;
exports.getBannerDurations = getBannerDurations;
exports.clearPricingConfigCache = clearPricingConfigCache;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const db = (0, shared_1.getFirestore)();
const defaultConfig = {
    promotions: {
        vehicle: {
            durations: [3, 7, 15, 30],
            prices: {
                3: 9.99,
                7: 19.99,
                15: 34.99,
                30: 59.99,
            },
        },
        dealer: {
            durations: [3, 7, 15, 30],
            prices: {
                3: 49.99,
                7: 89.99,
                15: 149.99,
                30: 199.99,
            },
        },
        seller: {
            durations: [3, 7, 15, 30],
            prices: {
                3: 24.99,
                7: 44.99,
                15: 79.99,
                30: 119.99,
            },
        },
    },
    banners: {
        hero: {
            durations: [7, 15, 30],
            prices: {
                7: 199,
                15: 349,
                30: 599,
            },
        },
        sidebar: {
            durations: [7, 15, 30],
            prices: {
                7: 99,
                15: 149,
                30: 299,
            },
        },
        between_content: {
            durations: [7, 15, 30],
            prices: {
                7: 149,
                15: 249,
                30: 449,
            },
        },
        sponsors_section: {
            durations: [7, 15, 30],
            prices: {
                7: 79,
                15: 129,
                30: 229,
            },
        },
    },
    limits: {
        maxActivePromotions: 12,
        maxActiveBanners: 4,
    },
};
let cachedConfig = null;
let cacheTimestamp = 0;
/** TTL corto: la config la edita el admin en Firestore y debe verse rápido en todas las instancias (sin redeploy). */
const CACHE_DURATION = 15 * 1000; // 15 segundos
/**
 * Obtiene la configuración de precios desde Firestore
 */
async function getPricingConfig() {
    // Verificar cache
    const now = Date.now();
    if (cachedConfig && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedConfig;
    }
    try {
        const configDoc = await getDb().collection('admin_config').doc('pricing').get();
        if (configDoc.exists) {
            const config = configDoc.data();
            cachedConfig = config;
            cacheTimestamp = now;
            return config;
        }
    }
    catch (error) {
        console.error('Error fetching pricing config:', error);
    }
    // Retornar configuración por defecto si no existe
    return defaultConfig;
}
/**
 * Obtiene el precio de una promoción
 */
async function getPromotionPrice(scope, duration) {
    const config = await getPricingConfig();
    return config.promotions[scope].prices[duration] || 0;
}
/**
 * Obtiene el precio de un banner según su placement
 */
async function getBannerPrice(placement, duration) {
    const config = await getPricingConfig();
    // Migrar estructura antigua si existe
    if (config.banners && !config.banners.hero && config.banners.durations) {
        const oldBanners = config.banners;
        config.banners = {
            hero: {
                durations: oldBanners.durations || [7, 15, 30],
                prices: oldBanners.prices || { 7: 199, 15: 349, 30: 599 },
            },
            sidebar: {
                durations: oldBanners.durations || [7, 15, 30],
                prices: oldBanners.prices || { 7: 99, 15: 149, 30: 299 },
            },
            between_content: {
                durations: oldBanners.durations || [7, 15, 30],
                prices: oldBanners.prices || { 7: 149, 15: 249, 30: 449 },
            },
            sponsors_section: {
                durations: oldBanners.durations || [7, 15, 30],
                prices: oldBanners.prices || { 7: 79, 15: 129, 30: 229 },
            },
        };
    }
    return config.banners[placement]?.prices[duration] || 0;
}
/**
 * Obtiene las duraciones disponibles para promociones
 */
async function getPromotionDurations(scope) {
    const config = await getPricingConfig();
    return config.promotions[scope].durations;
}
/**
 * Obtiene las duraciones disponibles para banners según su placement
 */
async function getBannerDurations(placement) {
    const config = await getPricingConfig();
    // Migrar estructura antigua si existe
    if (config.banners && !config.banners.hero && config.banners.durations) {
        const oldBanners = config.banners;
        return oldBanners.durations || [7, 15, 30];
    }
    return config.banners[placement]?.durations || [7, 15, 30];
}
/**
 * Limpia el cache de configuración
 */
function clearPricingConfigCache() {
    cachedConfig = null;
    cacheTimestamp = 0;
}
