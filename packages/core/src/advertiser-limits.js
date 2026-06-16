"use strict";
// Sistema de límites y validaciones para advertisers según plan
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
exports.PLAN_LIMITS = void 0;
exports.getAdvertiserPlanLimits = getAdvertiserPlanLimits;
exports.canCreateBanner = canCreateBanner;
exports.canReceiveImpressions = canReceiveImpressions;
exports.getMonthlyImpressionsUsage = getMonthlyImpressionsUsage;
exports.checkAndIncrementImpression = checkAndIncrementImpression;
const shared_1 = require("@autodealers/shared");
const advertisers_1 = require("./advertisers");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
exports.PAY_AS_YOU_GO_LIMITS = {
    maxImpressionsPerMonth: null,
    maxBanners: 999,
    allowedPlacements: ['hero', 'sidebar', 'sponsors_section', 'between_content'],
    hasAdvancedDashboard: true,
    hasAdvancedMetrics: true,
    hasBasicTargeting: true,
    hasAdvancedTargeting: true,
    hasABTesting: false,
};
exports.PLAN_LIMITS = {
    starter: {
        maxImpressionsPerMonth: 10000,
        maxBanners: 1,
        allowedPlacements: ['sponsors_section'],
        hasAdvancedDashboard: false,
        hasAdvancedMetrics: false,
        hasBasicTargeting: false,
        hasAdvancedTargeting: false,
        hasABTesting: false,
    },
    professional: {
        maxImpressionsPerMonth: 50000,
        maxBanners: 2,
        allowedPlacements: ['sponsors_section', 'sidebar'],
        hasAdvancedDashboard: true,
        hasAdvancedMetrics: true,
        hasBasicTargeting: true,
        hasAdvancedTargeting: false,
        hasABTesting: false,
    },
    premium: {
        maxImpressionsPerMonth: null, // Ilimitado
        maxBanners: 999, // Prácticamente ilimitado
        allowedPlacements: ['hero', 'sidebar', 'sponsors_section', 'between_content'],
        hasAdvancedDashboard: true,
        hasAdvancedMetrics: true,
        hasBasicTargeting: true,
        hasAdvancedTargeting: true,
        hasABTesting: true,
    },
};
/**
 * Obtiene los límites del plan de un anunciante
 */
async function getAdvertiserPlanLimits(advertiserId) {
    const advertiser = await (0, advertisers_1.getAdvertiserById)(advertiserId);
    if (!advertiser) {
        throw new Error('Anunciante no encontrado');
    }
    if (!advertiser.plan) {
        return exports.PAY_AS_YOU_GO_LIMITS;
    }
    return exports.PLAN_LIMITS[advertiser.plan];
}
/**
 * Verifica si un anunciante puede crear más banners
 */
async function canCreateBanner(advertiserId, placement) {
    const limits = await getAdvertiserPlanLimits(advertiserId);
    // Verificar si el placement está permitido
    if (!limits.allowedPlacements.includes(placement)) {
        return {
            allowed: false,
            reason: `Tu plan no permite banners en ${placement}. Planes permitidos: ${limits.allowedPlacements.join(', ')}`,
        };
    }
    // Contar banners activos del anunciante
    const now = admin.firestore.Timestamp.now();
    const activeBanners = await db
        .collection('sponsored_content')
        .where('advertiserId', '==', advertiserId)
        .where('status', 'in', ['active', 'approved', 'pending'])
        .where('endDate', '>=', now)
        .get();
    const currentCount = activeBanners.size;
    if (currentCount >= limits.maxBanners) {
        return {
            allowed: false,
            reason: `Has alcanzado el límite de ${limits.maxBanners} banner(s) activo(s) de tu plan. Actualiza a un plan superior para más banners.`,
        };
    }
    return { allowed: true };
}
/**
 * Verifica si un anunciante puede recibir más impresiones este mes
 */
async function canReceiveImpressions(advertiserId) {
    const limits = await getAdvertiserPlanLimits(advertiserId);
    // Si es ilimitado, siempre permitir
    if (limits.maxImpressionsPerMonth === null) {
        return { allowed: true, remaining: null };
    }
    // Calcular impresiones del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfMonth);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfMonth);
    // Obtener todas las campañas activas del anunciante
    const campaigns = await db
        .collection('sponsored_content')
        .where('advertiserId', '==', advertiserId)
        .where('status', '==', 'active')
        .get();
    let totalImpressions = 0;
    for (const campaignDoc of campaigns.docs) {
        const campaign = campaignDoc.data();
        // Obtener impresiones del mes desde métricas
        // Asumimos que las impresiones se registran en el campo impressions
        // En producción, podrías tener una colección separada de métricas diarias
        totalImpressions += campaign.impressions || 0;
    }
    const remaining = limits.maxImpressionsPerMonth - totalImpressions;
    if (remaining <= 0) {
        return {
            allowed: false,
            reason: `Has alcanzado el límite de ${limits.maxImpressionsPerMonth.toLocaleString()} impresiones/mes de tu plan. Actualiza a un plan superior.`,
            remaining: 0,
        };
    }
    return {
        allowed: true,
        remaining,
    };
}
/**
 * Obtiene el uso actual de impresiones del mes
 */
async function getMonthlyImpressionsUsage(advertiserId) {
    const limits = await getAdvertiserPlanLimits(advertiserId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Obtener todas las campañas activas del anunciante
    const campaigns = await db
        .collection('sponsored_content')
        .where('advertiserId', '==', advertiserId)
        .where('status', '==', 'active')
        .get();
    let totalImpressions = 0;
    for (const campaignDoc of campaigns.docs) {
        const campaign = campaignDoc.data();
        totalImpressions += campaign.impressions || 0;
    }
    if (limits.maxImpressionsPerMonth === null) {
        return {
            used: totalImpressions,
            limit: null,
            percentage: 0,
            remaining: null,
        };
    }
    const percentage = (totalImpressions / limits.maxImpressionsPerMonth) * 100;
    const remaining = Math.max(0, limits.maxImpressionsPerMonth - totalImpressions);
    return {
        used: totalImpressions,
        limit: limits.maxImpressionsPerMonth,
        percentage,
        remaining,
    };
}
/**
 * Verifica si una impresión puede ser registrada (antes de incrementar)
 */
async function checkAndIncrementImpression(contentId, advertiserId) {
    const canReceive = await canReceiveImpressions(advertiserId);
    if (!canReceive.allowed) {
        return {
            allowed: false,
            reason: canReceive.reason,
        };
    }
    // Si está permitido, la impresión se registrará normalmente
    return { allowed: true };
}
