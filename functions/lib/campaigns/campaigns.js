"use strict";
// Cloud Functions para Campaigns
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
exports.deleteCampaign = exports.updateCampaign = exports.createCampaign = exports.getCampaigns = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener campañas
 */
exports.getCampaigns = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, status, platform, limit } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('campaigns');
        if (status) {
            query = query.where('status', '==', status);
        }
        query = query.orderBy('createdAt', 'desc');
        if (limit) {
            query = query.limit(limit);
        }
        const snapshot = await query.get();
        let campaigns = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d, _e, _f;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { schedule: data.schedule
                    ? Object.assign(Object.assign({}, data.schedule), { startDate: (_a = data.schedule.startDate) === null || _a === void 0 ? void 0 : _a.toDate(), endDate: (_b = data.schedule.endDate) === null || _b === void 0 ? void 0 : _b.toDate() }) : undefined, createdAt: ((_c = data === null || data === void 0 ? void 0 : data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate()) || new Date(), updatedAt: ((_d = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate()) || new Date(), startedAt: (_e = data === null || data === void 0 ? void 0 : data.startedAt) === null || _e === void 0 ? void 0 : _e.toDate(), completedAt: (_f = data === null || data === void 0 ? void 0 : data.completedAt) === null || _f === void 0 ? void 0 : _f.toDate() });
        });
        // Filtrar por plataforma si se especifica
        if (platform) {
            campaigns = campaigns.filter((c) => { var _a; return (_a = c.platforms) === null || _a === void 0 ? void 0 : _a.includes(platform); });
        }
        return { campaigns };
    }
    catch (error) {
        console.error('Error getting campaigns:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get campaigns: ${error.message}`);
    }
});
/**
 * Crear campaña
 */
exports.createCampaign = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, name, description, type, platforms, budgets, content, schedule, status, aiGenerated } = request.data;
        if (!tenantId || !name || !type || !platforms || !content) {
            throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
        }
        const campaignRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('campaigns')
            .doc();
        const campaignData = {
            tenantId,
            name,
            description: description || '',
            type,
            platforms,
            budgets: budgets || [],
            content,
            targeting: request.data.targeting || {},
            schedule: schedule ? {
                startDate: admin.firestore.Timestamp.fromDate(new Date(schedule.startDate)),
                endDate: schedule.endDate ? admin.firestore.Timestamp.fromDate(new Date(schedule.endDate)) : null,
                times: schedule.times || [],
            } : null,
            status: status || 'draft',
            aiGenerated: aiGenerated || false,
            metrics: {
                impressions: 0,
                clicks: 0,
                engagements: 0,
                leads: 0,
                conversions: 0,
                spend: 0,
                ctr: 0,
                cpc: 0,
                cpl: 0,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await campaignRef.set(campaignData);
        return {
            campaign: Object.assign(Object.assign({ id: campaignRef.id }, campaignData), { createdAt: new Date(), updatedAt: new Date() }),
        };
    }
    catch (error) {
        console.error('Error creating campaign:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create campaign: ${error.message}`);
    }
});
/**
 * Actualizar campaña
 */
exports.updateCampaign = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    var _a, _b;
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, campaignId, updates } = request.data;
        if (!tenantId || !campaignId || !updates) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID, Campaign ID and updates are required');
        }
        const campaignRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('campaigns')
            .doc(campaignId);
        const updateData = Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (updates.schedule) {
            updateData.schedule = {
                startDate: admin.firestore.Timestamp.fromDate(new Date(updates.schedule.startDate)),
                endDate: updates.schedule.endDate ? admin.firestore.Timestamp.fromDate(new Date(updates.schedule.endDate)) : null,
                times: updates.schedule.times || [],
            };
        }
        await campaignRef.update(updateData);
        const updatedDoc = await campaignRef.get();
        const data = updatedDoc.data();
        return {
            campaign: Object.assign(Object.assign({ id: updatedDoc.id }, data), { createdAt: ((_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(), updatedAt: ((_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date() }),
        };
    }
    catch (error) {
        console.error('Error updating campaign:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update campaign: ${error.message}`);
    }
});
/**
 * Eliminar campaña
 */
exports.deleteCampaign = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, campaignId } = request.data;
        if (!tenantId || !campaignId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and Campaign ID are required');
        }
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('campaigns')
            .doc(campaignId)
            .delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting campaign:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to delete campaign: ${error.message}`);
    }
});
//# sourceMappingURL=campaigns.js.map