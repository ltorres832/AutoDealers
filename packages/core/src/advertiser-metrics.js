"use strict";
// Sistema de métricas mensuales para advertisers
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
exports.recordMonthlyImpression = recordMonthlyImpression;
exports.getMonthlyMetrics = getMonthlyMetrics;
exports.getAdvertiserMonthlyMetrics = getAdvertiserMonthlyMetrics;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Registra una impresión y actualiza métricas mensuales
 */
async function recordMonthlyImpression(contentId, advertiserId) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Actualizar métrica mensual
    const metricsRef = getDb().collection('sponsored_content')
        .doc(contentId)
        .collection('monthly_metrics')
        .doc(monthKey);
    const metricsDoc = await metricsRef.get();
    if (metricsDoc.exists) {
        await metricsRef.update({
            impressions: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    else {
        await metricsRef.set({
            month: monthKey,
            impressions: 1,
            clicks: 0,
            conversions: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // También actualizar el campo directo para compatibilidad
    await getDb().collection('sponsored_content').doc(contentId).update({
        impressions: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene métricas mensuales de un contenido
 */
async function getMonthlyMetrics(contentId, month) {
    const now = new Date();
    const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const metricsDoc = await getDb().collection('sponsored_content')
        .doc(contentId)
        .collection('monthly_metrics')
        .doc(monthKey)
        .get();
    if (!metricsDoc.exists) {
        return {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
        };
    }
    const data = metricsDoc.data();
    const impressions = data.impressions || 0;
    const clicks = data.clicks || 0;
    const conversions = data.conversions || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return {
        impressions,
        clicks,
        conversions,
        ctr,
    };
}
/**
 * Obtiene métricas mensuales totales de un anunciante
 */
async function getAdvertiserMonthlyMetrics(advertiserId, month) {
    const now = new Date();
    const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Obtener todas las campañas activas del anunciante
    const campaignsSnapshot = await getDb().collection('sponsored_content')
        .where('advertiserId', '==', advertiserId)
        .where('status', '==', 'active')
        .get();
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    const campaigns = [];
    for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data();
        const metrics = await getMonthlyMetrics(campaignDoc.id, monthKey);
        totalImpressions += metrics.impressions;
        totalClicks += metrics.clicks;
        totalConversions += metrics.conversions;
        campaigns.push({
            contentId: campaignDoc.id,
            title: campaign.title || 'Sin título',
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            ctr: metrics.ctr,
        });
    }
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return {
        totalImpressions,
        totalClicks,
        totalConversions,
        averageCTR,
        campaigns,
    };
}
