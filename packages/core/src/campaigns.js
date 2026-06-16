"use strict";
// Sistema de campañas de publicidad
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
exports.createCampaign = createCampaign;
exports.getCampaigns = getCampaigns;
exports.updateCampaign = updateCampaign;
exports.updateCampaignMetrics = updateCampaignMetrics;
exports.startCampaign = startCampaign;
exports.pauseCampaign = pauseCampaign;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea una nueva campaña
 */
async function createCampaign(campaign) {
    const docRef = getDb()
        .collection('tenants')
        .doc(campaign.tenantId)
        .collection('campaigns')
        .doc();
    await docRef.set({
        ...campaign,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...campaign,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene campañas de un tenant
 */
async function getCampaigns(tenantId, filters) {
    let query = getDb().collection('tenants')
        .doc(tenantId)
        .collection('campaigns');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    query = query.orderBy('createdAt', 'desc');
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }
    const snapshot = await query.get();
    let campaigns = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            schedule: data.schedule
                ? {
                    ...data.schedule,
                    startDate: data.schedule.startDate?.toDate(),
                    endDate: data.schedule.endDate?.toDate(),
                }
                : undefined,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
            startedAt: data?.startedAt?.toDate(),
            completedAt: data?.completedAt?.toDate(),
        };
    });
    // Filtrar por plataforma si se especifica
    if (filters?.platform) {
        campaigns = campaigns.filter((c) => c.platforms.includes(filters.platform));
    }
    return campaigns;
}
/**
 * Actualiza una campaña
 */
async function updateCampaign(tenantId, campaignId, updates) {
    await getDb().collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .doc(campaignId)
        .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Actualiza métricas de una campaña
 */
async function updateCampaignMetrics(tenantId, campaignId, metrics) {
    const campaignDoc = await getDb().collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .doc(campaignId)
        .get();
    if (!campaignDoc.exists) {
        throw new Error('Campaign not found');
    }
    const currentMetrics = campaignDoc.data()?.metrics || {};
    const updatedMetrics = {
        ...currentMetrics,
        ...metrics,
        // Calcular métricas derivadas
        ctr: metrics.clicks && metrics.impressions
            ? (metrics.clicks / metrics.impressions) * 100
            : currentMetrics.ctr,
        cpc: metrics.clicks && metrics.spend
            ? metrics.spend / metrics.clicks
            : currentMetrics.cpc,
        cpl: metrics.leads && metrics.spend
            ? metrics.spend / metrics.leads
            : currentMetrics.cpl,
    };
    await getDb().collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .doc(campaignId)
        .update({
        metrics: updatedMetrics,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Inicia una campaña
 */
async function startCampaign(tenantId, campaignId) {
    await updateCampaign(tenantId, campaignId, {
        status: 'active',
        startedAt: new Date(),
    });
}
/**
 * Pausa una campaña
 */
async function pauseCampaign(tenantId, campaignId) {
    await updateCampaign(tenantId, campaignId, {
        status: 'paused',
    });
}
