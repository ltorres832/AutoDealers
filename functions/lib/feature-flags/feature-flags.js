"use strict";
// Cloud Functions para Feature Flags
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
exports.updateFeatureFlag = exports.checkFeatureFlag = exports.getFeatureFlags = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener feature flags de un dashboard
 */
exports.getFeatureFlags = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { dashboard } = request.data;
        if (!dashboard) {
            throw new https_1.HttpsError('invalid-argument', 'Dashboard is required');
        }
        const snapshot = await db
            .collection('feature_flags')
            .where('dashboard', '==', dashboard)
            .get();
        const features = snapshot.docs.map((doc) => {
            var _a, _b;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(), updatedAt: ((_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date() });
        });
        return { features };
    }
    catch (error) {
        console.error('Error getting feature flags:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get feature flags: ${error.message}`);
    }
});
/**
 * Verificar si una feature está habilitada
 */
exports.checkFeatureFlag = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { dashboard, featureKey } = request.data;
        if (!dashboard || !featureKey) {
            throw new https_1.HttpsError('invalid-argument', 'Dashboard and feature key are required');
        }
        const snapshot = await db
            .collection('feature_flags')
            .where('dashboard', '==', dashboard)
            .where('featureKey', '==', featureKey)
            .limit(1)
            .get();
        if (snapshot.empty) {
            // Por defecto, si no existe configuración, la feature está habilitada
            return { enabled: true };
        }
        const config = snapshot.docs[0].data();
        return { enabled: config.enabled !== false };
    }
    catch (error) {
        console.error('Error checking feature flag:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to check feature flag: ${error.message}`);
    }
});
/**
 * Actualizar feature flag (solo admin)
 */
exports.updateFeatureFlag = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    var _a, _b;
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can update feature flags');
        }
        const { dashboard, featureKey, enabled, featureName, description, category } = request.data;
        if (!dashboard || !featureKey || enabled === undefined) {
            throw new https_1.HttpsError('invalid-argument', 'Dashboard, feature key and enabled are required');
        }
        const snapshot = await db
            .collection('feature_flags')
            .where('dashboard', '==', dashboard)
            .where('featureKey', '==', featureKey)
            .limit(1)
            .get();
        if (snapshot.empty) {
            // Crear nueva configuración
            const newConfigRef = db.collection('feature_flags').doc();
            const newConfig = {
                dashboard,
                featureKey,
                featureName: featureName || featureKey,
                enabled,
                description: description || '',
                category: category || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await newConfigRef.set(newConfig);
            return {
                config: Object.assign(Object.assign({ id: newConfigRef.id }, newConfig), { createdAt: new Date(), updatedAt: new Date() }),
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
            const data = updated.data();
            return {
                config: Object.assign(Object.assign({ id: updated.id }, data), { createdAt: ((_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(), updatedAt: ((_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date() }),
            };
        }
    }
    catch (error) {
        console.error('Error updating feature flag:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update feature flag: ${error.message}`);
    }
});
//# sourceMappingURL=feature-flags.js.map