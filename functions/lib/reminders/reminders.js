"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelReminder = exports.updateReminder = exports.markReminderAsSentFunction = exports.getRemindersFunction = exports.getPendingRemindersFunction = exports.createPostSaleRemindersFunction = exports.createReminderFunction = void 0;
// Cloud Functions para Reminders
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const crm_1 = require("@autodealers/crm");
const db = (0, firestore_1.getFirestore)();
// Crear recordatorio
exports.createReminderFunction = (0, https_1.onCall)(async (request) => {
    const { reminderData } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!reminderData) {
        throw new https_1.HttpsError('invalid-argument', 'reminderData es requerido');
    }
    try {
        const reminder = await (0, crm_1.createReminder)(reminderData);
        return { reminder };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear recordatorio: ${error.message}`);
    }
});
// Crear recordatorios post-venta
exports.createPostSaleRemindersFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, saleId, customerId, vehicleId, selectedReminders } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !saleId || !customerId || !vehicleId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, saleId, customerId y vehicleId son requeridos');
    }
    try {
        const reminders = await (0, crm_1.createPostSaleReminders)(tenantId, saleId, customerId, vehicleId, selectedReminders);
        return { reminders };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear recordatorios post-venta: ${error.message}`);
    }
});
// Obtener recordatorios pendientes
exports.getPendingRemindersFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const reminders = await (0, crm_1.getPendingReminders)(tenantId);
        return { reminders };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener recordatorios pendientes: ${error.message}`);
    }
});
// Obtener recordatorios
exports.getRemindersFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const reminders = await (0, crm_1.getReminders)(tenantId, filters);
        return { reminders };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener recordatorios: ${error.message}`);
    }
});
// Marcar recordatorio como enviado
exports.markReminderAsSentFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, reminderId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !reminderId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y reminderId son requeridos');
    }
    try {
        await (0, crm_1.markReminderAsSent)(tenantId, reminderId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al marcar recordatorio como enviado: ${error.message}`);
    }
});
// Actualizar recordatorio
exports.updateReminder = (0, https_1.onCall)(async (request) => {
    const { tenantId, reminderId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !reminderId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, reminderId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('post_sale_reminders')
            .doc(reminderId)
            .update(updates);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar recordatorio: ${error.message}`);
    }
});
// Cancelar recordatorio
exports.cancelReminder = (0, https_1.onCall)(async (request) => {
    const { tenantId, reminderId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !reminderId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y reminderId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('post_sale_reminders')
            .doc(reminderId)
            .update({
            status: 'cancelled',
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al cancelar recordatorio: ${error.message}`);
    }
});
//# sourceMappingURL=reminders.js.map