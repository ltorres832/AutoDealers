"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsReadFunction = exports.markNotificationAsReadFunction = exports.getUserNotificationsFunction = exports.createNotificationFunction = void 0;
// Cloud Functions para Notificaciones
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const core_1 = require("@autodealers/core");
const db = (0, firestore_1.getFirestore)();
// Crear notificación
exports.createNotificationFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId, type, title, message, channels, metadata } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !userId || !type || !title || !message) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, userId, type, title y message son requeridos');
    }
    try {
        const notification = await (0, core_1.createNotification)({
            tenantId,
            userId,
            type,
            title,
            message,
            channels: channels || ['system'],
            metadata,
        });
        return { notification };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear notificación: ${error.message}`);
    }
});
// Obtener notificaciones del usuario
exports.getUserNotificationsFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId, unreadOnly, limit } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !userId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y userId son requeridos');
    }
    try {
        const notifications = await (0, core_1.getUserNotifications)(tenantId, userId, {
            unreadOnly,
            limit,
        });
        return { notifications };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener notificaciones: ${error.message}`);
    }
});
// Marcar notificación como leída
exports.markNotificationAsReadFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, notificationId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !notificationId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y notificationId son requeridos');
    }
    try {
        await (0, core_1.markNotificationAsRead)(tenantId, notificationId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al marcar notificación como leída: ${error.message}`);
    }
});
// Marcar todas las notificaciones como leídas
exports.markAllNotificationsAsReadFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !userId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y userId son requeridos');
    }
    try {
        await (0, core_1.markAllNotificationsAsRead)(tenantId, userId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al marcar todas las notificaciones como leídas: ${error.message}`);
    }
});
//# sourceMappingURL=notifications.js.map