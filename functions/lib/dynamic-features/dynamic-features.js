"use strict";
// Cloud Functions para Dynamic Features (Features activables dinámicamente por tenant)
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
exports.checkDynamicFeature = exports.updateDynamicFeatures = exports.getDynamicFeatures = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener features dinámicas de un tenant
 */
exports.getDynamicFeatures = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        // Obtener features dinámicas del tenant
        const featuresDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('dynamic_features')
            .get();
        if (!featuresDoc.exists) {
            // Features por defecto basadas en membresía
            const tenantDoc = await db.collection('tenants').doc(tenantId).get();
            const tenantData = tenantDoc.data();
            const membershipId = tenantData === null || tenantData === void 0 ? void 0 : tenantData.membershipId;
            let defaultFeatures = {};
            if (membershipId) {
                const membershipDoc = await db.collection('memberships').doc(membershipId).get();
                const membershipData = membershipDoc.data();
                const features = (membershipData === null || membershipData === void 0 ? void 0 : membershipData.features) || {};
                defaultFeatures = {
                    crm: true,
                    inventory: true,
                    messaging: features.messagingEnabled || false,
                    appointments: true,
                    sales: true,
                    reports: features.advancedReports || false,
                    ai: features.aiEnabled || false,
                    socialMedia: features.socialMediaEnabled || false,
                    workflows: features.workflowsEnabled || false,
                    tasks: true,
                    contracts: features.contractsEnabled || false,
                    reviews: true,
                    referrals: true,
                    banners: features.bannersEnabled || false,
                    promotions: features.promotionsEnabled || false,
                    fi: features.fiEnabled || false,
                    customerFiles: true,
                    reminders: true,
                    internalChat: true,
                    publicChat: true,
                };
            }
            else {
                // Features básicas si no hay membresía
                defaultFeatures = {
                    crm: true,
                    inventory: true,
                    messaging: false,
                    appointments: true,
                    sales: true,
                    reports: false,
                    ai: false,
                    socialMedia: false,
                    workflows: false,
                    tasks: true,
                    contracts: false,
                    reviews: true,
                    referrals: false,
                    banners: false,
                    promotions: false,
                    fi: false,
                    customerFiles: true,
                    reminders: true,
                    internalChat: true,
                    publicChat: true,
                };
            }
            // Guardar features por defecto
            await db
                .collection('tenants')
                .doc(tenantId)
                .collection('settings')
                .doc('dynamic_features')
                .set({
                features: defaultFeatures,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { features: defaultFeatures };
        }
        const featuresData = featuresDoc.data();
        return { features: (featuresData === null || featuresData === void 0 ? void 0 : featuresData.features) || {} };
    }
    catch (error) {
        console.error('Error getting dynamic features:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get dynamic features: ${error.message}`);
    }
});
/**
 * Actualizar features dinámicas (solo admin o tenant owner)
 */
exports.updateDynamicFeatures = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, features } = request.data;
        if (!tenantId || !features) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and features are required');
        }
        // Verificar permisos
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin' && (userData === null || userData === void 0 ? void 0 : userData.tenantId) !== tenantId) {
            throw new https_1.HttpsError('permission-denied', 'Only admins or tenant owners can update dynamic features');
        }
        // Actualizar features
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('dynamic_features')
            .set({
            features,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { success: true, message: 'Dynamic features updated successfully' };
    }
    catch (error) {
        console.error('Error updating dynamic features:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update dynamic features: ${error.message}`);
    }
});
/**
 * Verificar si una feature está habilitada para un tenant
 */
exports.checkDynamicFeature = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { tenantId, featureKey } = request.data;
        if (!tenantId || !featureKey) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and feature key are required');
        }
        const featuresDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('dynamic_features')
            .get();
        if (!featuresDoc.exists) {
            // Por defecto, retornar false si no existe configuración
            return { enabled: false };
        }
        const featuresData = featuresDoc.data();
        const features = (featuresData === null || featuresData === void 0 ? void 0 : featuresData.features) || {};
        return { enabled: features[featureKey] === true };
    }
    catch (error) {
        console.error('Error checking dynamic feature:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to check dynamic feature: ${error.message}`);
    }
});
//# sourceMappingURL=dynamic-features.js.map