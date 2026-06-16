"use strict";
// Sistema de ads pagados para Facebook e Instagram
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
exports.createAdCampaign = createAdCampaign;
exports.startAdCampaign = startAdCampaign;
exports.pauseAdCampaign = pauseAdCampaign;
exports.getAdCampaigns = getAdCampaigns;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Crea una campaña de ads
 */
async function createAdCampaign(campaign) {
    const docRef = db
        .collection('tenants')
        .doc(campaign.tenantId)
        .collection('ad_campaigns')
        .doc();
    const campaignData = {
        ...campaign,
        status: 'draft',
        spent: 0,
        impressions: 0,
        clicks: 0,
        messages: 0,
        visits: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.set(campaignData);
    return {
        id: docRef.id,
        ...campaign,
        status: 'draft',
        spent: 0,
        impressions: 0,
        clicks: 0,
        messages: 0,
        visits: 0,
        createdAt: new Date(),
    };
}
/**
 * Inicia una campaña de ads en Meta
 */
async function startAdCampaign(tenantId, campaignId) {
    try {
        // Obtener la campaña
        const campaignDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('ad_campaigns')
            .doc(campaignId)
            .get();
        if (!campaignDoc.exists) {
            return { success: false, error: 'Campaña no encontrada' };
        }
        const campaign = campaignDoc.data();
        // Obtener integración de Facebook
        const integrationSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('integrations')
            .where('type', '==', 'facebook')
            .where('status', '==', 'active')
            .get();
        if (integrationSnapshot.empty) {
            return { success: false, error: 'Facebook no está conectado' };
        }
        const integration = integrationSnapshot.docs[0].data();
        const accessToken = integration.credentials?.accessToken;
        const adAccountId = integration.credentials?.adAccountId;
        if (!accessToken || !adAccountId) {
            return { success: false, error: 'Credenciales de ads no configuradas' };
        }
        // Crear ad set en Meta
        const dailyBudget = campaign.dailyBudget || (campaign.budget / campaign.duration);
        const adSetResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adsets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: campaign.name,
                campaign_id: adAccountId, // Necesitarías crear una campaña primero
                daily_budget: Math.round(dailyBudget * 100), // En centavos
                billing_event: 'IMPRESSIONS',
                optimization_goal: campaign.objective === 'more_messages' ? 'MESSAGES' : 'LINK_CLICKS',
                targeting: {
                    age_min: 18,
                    age_max: 65,
                    genders: [1, 2], // Ambos géneros
                    geo_locations: {
                        countries: ['MX'], // México por defecto
                    },
                },
                status: 'PAUSED', // Empezar pausado hasta que el ad esté listo
            }),
        });
        const adSetData = await adSetResponse.json();
        if (!adSetResponse.ok) {
            return { success: false, error: adSetData.error?.message || 'Error al crear ad set' };
        }
        // Actualizar campaña con ad set ID
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('ad_campaigns')
            .doc(campaignId)
            .update({
            adSetId: adSetData.id,
            status: 'active',
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            adSetId: adSetData.id,
        };
    }
    catch (error) {
        console.error('Error starting ad campaign:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
/**
 * Pausa una campaña de ads
 */
async function pauseAdCampaign(tenantId, campaignId) {
    try {
        const campaignDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('ad_campaigns')
            .doc(campaignId)
            .get();
        if (!campaignDoc.exists) {
            return { success: false, error: 'Campaña no encontrada' };
        }
        const campaign = campaignDoc.data();
        if (campaign.adSetId) {
            // Pausar en Meta
            const integrationSnapshot = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('integrations')
                .where('type', '==', 'facebook')
                .where('status', '==', 'active')
                .get();
            if (!integrationSnapshot.empty) {
                const integration = integrationSnapshot.docs[0].data();
                const accessToken = integration.credentials?.accessToken;
                await fetch(`https://graph.facebook.com/v18.0/${campaign.adSetId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: 'PAUSED',
                    }),
                });
            }
        }
        // Actualizar en Firestore
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('ad_campaigns')
            .doc(campaignId)
            .update({
            status: 'paused',
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error pausing ad campaign:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
/**
 * Obtiene campañas de ads de un tenant
 */
async function getAdCampaigns(tenantId, userId) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('ad_campaigns');
    if (userId) {
        query = query.where('userId', '==', userId);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            startedAt: data.startedAt?.toDate(),
            endedAt: data.endedAt?.toDate(),
        };
    });
}
