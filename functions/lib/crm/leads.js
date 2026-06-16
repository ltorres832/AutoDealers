"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLead = exports.updateLead = exports.createLead = exports.getLeads = void 0;
// Cloud Functions para CRM - Leads
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Obtener leads del tenant
exports.getLeads = (0, https_1.onCall)(async (request) => {
    const { tenantId, status, assignedTo, source } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (assignedTo) {
            query = query.where('assignedTo', '==', assignedTo);
        }
        if (source) {
            query = query.where('source', '==', source);
        }
        query = query.orderBy('createdAt', 'desc').limit(50);
        const snapshot = await query.get();
        const leads = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { leads };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener leads: ${error.message}`);
    }
});
// Crear un nuevo lead
exports.createLead = (0, https_1.onCall)(async (request) => {
    const { tenantId, lead } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !lead) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y lead son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, lead), { createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear lead: ${error.message}`);
    }
});
// Actualizar un lead
exports.updateLead = (0, https_1.onCall)(async (request) => {
    const { tenantId, leadId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !leadId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, leadId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar lead: ${error.message}`);
    }
});
// Eliminar un lead
exports.deleteLead = (0, https_1.onCall)(async (request) => {
    const { tenantId, leadId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !leadId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y leadId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar lead: ${error.message}`);
    }
});
//# sourceMappingURL=leads.js.map