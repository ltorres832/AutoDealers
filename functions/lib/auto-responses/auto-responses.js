"use strict";
// Cloud Functions para Auto-Responses
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
exports.deleteAutoResponse = exports.updateAutoResponse = exports.createAutoResponse = exports.getAutoResponses = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener respuestas automáticas activas
 */
exports.getAutoResponses = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, activeOnly } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('auto_responses');
        if (activeOnly !== false) {
            query = query.where('isActive', '==', true);
        }
        query = query.orderBy('priority', 'desc');
        const snapshot = await query.get();
        const responses = snapshot.docs.map((doc) => {
            var _a, _b;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(), updatedAt: ((_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date() });
        });
        return { responses };
    }
    catch (error) {
        console.error('Error getting auto responses:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get auto responses: ${error.message}`);
    }
});
/**
 * Crear respuesta automática
 */
exports.createAutoResponse = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, name, trigger, response, channels, isActive, priority } = request.data;
        if (!tenantId || !name || !trigger || !response || !channels) {
            throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
        }
        const responseRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('auto_responses')
            .doc();
        const responseData = {
            tenantId,
            name,
            trigger,
            response,
            channels,
            isActive: isActive !== undefined ? isActive : true,
            priority: priority || 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await responseRef.set(responseData);
        return {
            response: Object.assign(Object.assign({ id: responseRef.id }, responseData), { createdAt: new Date(), updatedAt: new Date() }),
        };
    }
    catch (error) {
        console.error('Error creating auto response:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create auto response: ${error.message}`);
    }
});
/**
 * Actualizar respuesta automática
 */
exports.updateAutoResponse = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, responseId, updates } = request.data;
        if (!tenantId || !responseId || !updates) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID, Response ID and updates are required');
        }
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('auto_responses')
            .doc(responseId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        return { success: true };
    }
    catch (error) {
        console.error('Error updating auto response:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update auto response: ${error.message}`);
    }
});
/**
 * Eliminar respuesta automática
 */
exports.deleteAutoResponse = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, responseId } = request.data;
        if (!tenantId || !responseId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and Response ID are required');
        }
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('auto_responses')
            .doc(responseId)
            .delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting auto response:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to delete auto response: ${error.message}`);
    }
});
//# sourceMappingURL=auto-responses.js.map