"use strict";
// Cloud Functions para Communication Templates
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
exports.processTemplate = exports.deleteCommunicationTemplate = exports.updateCommunicationTemplate = exports.createCommunicationTemplate = exports.getCommunicationTemplates = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener templates de comunicación
 */
exports.getCommunicationTemplates = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { category, channel, role } = request.data;
        let query = db.collection('communication_templates');
        if (category) {
            query = query.where('category', '==', category);
        }
        if (channel) {
            query = query.where('channel', '==', channel);
        }
        if (role) {
            query = query.where('role', '==', role);
        }
        query = query.where('isActive', '==', true).orderBy('name', 'asc');
        const snapshot = await query.get();
        const templates = snapshot.docs.map((doc) => {
            var _a, _b;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(), updatedAt: ((_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date() });
        });
        return { templates };
    }
    catch (error) {
        console.error('Error getting communication templates:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get communication templates: ${error.message}`);
    }
});
/**
 * Crear template de comunicación (solo admin)
 */
exports.createCommunicationTemplate = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can create communication templates');
        }
        const { name, category, channel, role, subject, body, variables, isActive } = request.data;
        if (!name || !category || !channel || !body) {
            throw new https_1.HttpsError('invalid-argument', 'Name, category, channel and body are required');
        }
        const templateRef = db.collection('communication_templates').doc();
        const templateData = {
            name,
            category, // 'email', 'sms', 'whatsapp', 'facebook', 'instagram'
            channel, // 'lead_followup', 'appointment_reminder', 'sale_confirmation', etc.
            role: role || 'all', // 'admin', 'dealer', 'seller', 'all'
            subject: subject || '',
            body,
            variables: variables || [], // Variables disponibles para reemplazar
            isActive: isActive !== undefined ? isActive : true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await templateRef.set(templateData);
        return {
            template: Object.assign(Object.assign({ id: templateRef.id }, templateData), { createdAt: new Date(), updatedAt: new Date() }),
        };
    }
    catch (error) {
        console.error('Error creating communication template:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create communication template: ${error.message}`);
    }
});
/**
 * Actualizar template de comunicación (solo admin)
 */
exports.updateCommunicationTemplate = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can update communication templates');
        }
        const { templateId, updates } = request.data;
        if (!templateId || !updates) {
            throw new https_1.HttpsError('invalid-argument', 'Template ID and updates are required');
        }
        await db.collection('communication_templates').doc(templateId).update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        return { success: true };
    }
    catch (error) {
        console.error('Error updating communication template:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update communication template: ${error.message}`);
    }
});
/**
 * Eliminar template de comunicación (solo admin)
 */
exports.deleteCommunicationTemplate = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can delete communication templates');
        }
        const { templateId } = request.data;
        if (!templateId) {
            throw new https_1.HttpsError('invalid-argument', 'Template ID is required');
        }
        await db.collection('communication_templates').doc(templateId).delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting communication template:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to delete communication template: ${error.message}`);
    }
});
/**
 * Procesar template con variables
 */
exports.processTemplate = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { templateId, variables } = request.data;
        if (!templateId || !variables) {
            throw new https_1.HttpsError('invalid-argument', 'Template ID and variables are required');
        }
        const templateDoc = await db.collection('communication_templates').doc(templateId).get();
        if (!templateDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Template not found');
        }
        const templateData = templateDoc.data();
        let processedSubject = (templateData === null || templateData === void 0 ? void 0 : templateData.subject) || '';
        let processedBody = (templateData === null || templateData === void 0 ? void 0 : templateData.body) || '';
        // Reemplazar variables en subject y body
        Object.keys(variables).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processedSubject = processedSubject.replace(regex, variables[key]);
            processedBody = processedBody.replace(regex, variables[key]);
        });
        return {
            subject: processedSubject,
            body: processedBody,
        };
    }
    catch (error) {
        console.error('Error processing template:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to process template: ${error.message}`);
    }
});
//# sourceMappingURL=communication-templates.js.map