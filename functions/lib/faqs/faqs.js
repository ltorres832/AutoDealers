"use strict";
// Cloud Functions para FAQs
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
exports.deleteFAQ = exports.updateFAQ = exports.createFAQ = exports.getFAQs = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener FAQs activas
 */
exports.getFAQs = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { tenantId, activeOnly } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('faqs');
        if (activeOnly !== false) {
            query = query.where('isActive', '==', true);
        }
        query = query.orderBy('order', 'asc');
        const snapshot = await query.get();
        const faqs = snapshot.docs.map((doc) => {
            var _a, _b;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(), updatedAt: ((_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date() });
        });
        return { faqs };
    }
    catch (error) {
        console.error('Error getting FAQs:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get FAQs: ${error.message}`);
    }
});
/**
 * Crear FAQ
 */
exports.createFAQ = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, question, answer, category, keywords, isActive, order } = request.data;
        if (!tenantId || !question || !answer) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID, question and answer are required');
        }
        const faqRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('faqs')
            .doc();
        const faqData = {
            tenantId,
            question,
            answer,
            category: category || '',
            keywords: keywords || [],
            isActive: isActive !== undefined ? isActive : true,
            order: order || 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await faqRef.set(faqData);
        return {
            faq: Object.assign(Object.assign({ id: faqRef.id }, faqData), { createdAt: new Date(), updatedAt: new Date() }),
        };
    }
    catch (error) {
        console.error('Error creating FAQ:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create FAQ: ${error.message}`);
    }
});
/**
 * Actualizar FAQ
 */
exports.updateFAQ = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, faqId, updates } = request.data;
        if (!tenantId || !faqId || !updates) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID, FAQ ID and updates are required');
        }
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('faqs')
            .doc(faqId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        return { success: true };
    }
    catch (error) {
        console.error('Error updating FAQ:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update FAQ: ${error.message}`);
    }
});
/**
 * Eliminar FAQ
 */
exports.deleteFAQ = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, faqId } = request.data;
        if (!tenantId || !faqId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and FAQ ID are required');
        }
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('faqs')
            .doc(faqId)
            .delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting FAQ:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to delete FAQ: ${error.message}`);
    }
});
//# sourceMappingURL=faqs.js.map