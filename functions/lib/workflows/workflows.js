"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkflow = exports.updateWorkflow = exports.getWorkflows = exports.createWorkflow = void 0;
// Cloud Functions para Workflows
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear workflow
exports.createWorkflow = (0, https_1.onCall)(async (request) => {
    const { tenantId, workflow } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !workflow) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y workflow son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('workflows')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, workflow), { createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear workflow: ${error.message}`);
    }
});
// Obtener workflows
exports.getWorkflows = (0, https_1.onCall)(async (request) => {
    const { tenantId, status } = request.data;
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
            .collection('workflows');
        if (status) {
            query = query.where('status', '==', status);
        }
        query = query.orderBy('createdAt', 'desc').limit(100);
        const snapshot = await query.get();
        const workflows = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { workflows };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener workflows: ${error.message}`);
    }
});
// Actualizar workflow
exports.updateWorkflow = (0, https_1.onCall)(async (request) => {
    const { tenantId, workflowId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !workflowId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, workflowId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('workflows')
            .doc(workflowId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar workflow: ${error.message}`);
    }
});
// Eliminar workflow
exports.deleteWorkflow = (0, https_1.onCall)(async (request) => {
    const { tenantId, workflowId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !workflowId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y workflowId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('workflows')
            .doc(workflowId)
            .delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar workflow: ${error.message}`);
    }
});
//# sourceMappingURL=workflows.js.map