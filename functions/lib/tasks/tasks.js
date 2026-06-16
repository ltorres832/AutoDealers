"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.completeTask = exports.updateTask = exports.getTasks = exports.createTask = void 0;
// Cloud Functions para Tasks
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear task
exports.createTask = (0, https_1.onCall)(async (request) => {
    const { tenantId, task } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !task) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y task son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('tasks')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, task), { completed: false, createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear task: ${error.message}`);
    }
});
// Obtener tasks
exports.getTasks = (0, https_1.onCall)(async (request) => {
    const { tenantId, assignedTo, completed, limit } = request.data;
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
            .collection('tasks');
        if (assignedTo) {
            query = query.where('assignedTo', '==', assignedTo);
        }
        if (completed != null) {
            query = query.where('completed', '==', completed);
        }
        query = query.orderBy('createdAt', 'desc').limit(limit || 100);
        const snapshot = await query.get();
        const tasks = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { tasks };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener tasks: ${error.message}`);
    }
});
// Actualizar task
exports.updateTask = (0, https_1.onCall)(async (request) => {
    const { tenantId, taskId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !taskId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, taskId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('tasks')
            .doc(taskId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar task: ${error.message}`);
    }
});
// Completar task
exports.completeTask = (0, https_1.onCall)(async (request) => {
    const { tenantId, taskId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !taskId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y taskId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('tasks')
            .doc(taskId)
            .update({
            completed: true,
            completedAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al completar task: ${error.message}`);
    }
});
// Eliminar task
exports.deleteTask = (0, https_1.onCall)(async (request) => {
    const { tenantId, taskId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !taskId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y taskId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('tasks')
            .doc(taskId)
            .delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar task: ${error.message}`);
    }
});
//# sourceMappingURL=tasks.js.map