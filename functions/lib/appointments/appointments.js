"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointment = exports.createAppointment = exports.getAppointments = void 0;
// Cloud Functions para Appointments
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Obtener citas del tenant
exports.getAppointments = (0, https_1.onCall)(async (request) => {
    const { tenantId, leadId, assignedTo, status } = request.data;
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
            .collection('appointments');
        if (leadId) {
            query = query.where('leadId', '==', leadId);
        }
        if (assignedTo) {
            query = query.where('assignedTo', '==', assignedTo);
        }
        if (status) {
            query = query.where('status', '==', status);
        }
        query = query.orderBy('scheduledAt', 'asc').limit(100);
        const snapshot = await query.get();
        const appointments = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { appointments };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener citas: ${error.message}`);
    }
});
// Crear cita
exports.createAppointment = (0, https_1.onCall)(async (request) => {
    const { tenantId, appointment } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !appointment) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y appointment son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('appointments')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, appointment), { createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear cita: ${error.message}`);
    }
});
// Actualizar cita
exports.updateAppointment = (0, https_1.onCall)(async (request) => {
    const { tenantId, appointmentId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !appointmentId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, appointmentId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('appointments')
            .doc(appointmentId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar cita: ${error.message}`);
    }
});
//# sourceMappingURL=appointments.js.map