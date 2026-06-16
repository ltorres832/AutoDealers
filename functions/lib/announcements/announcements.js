"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnouncement = exports.updateAnnouncement = exports.dismissAnnouncement = exports.getActiveAnnouncements = exports.getAnnouncements = exports.createAnnouncement = void 0;
// Cloud Functions para Announcements
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const core_1 = require("@autodealers/core");
const db = (0, firestore_1.getFirestore)();
// Crear anuncio
exports.createAnnouncement = (0, https_1.onCall)(async (request) => {
    const { tenantId, announcement, sendNotifications } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !announcement) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y announcement son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('announcements')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, announcement), { isActive: true, dismissedBy: [], createdBy: auth.uid, createdAt: new Date(), updatedAt: new Date() }));
        // Enviar notificaciones si se solicita
        if (sendNotifications !== false) {
            await sendAnnouncementNotifications(docRef.id, tenantId, announcement);
        }
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear anuncio: ${error.message}`);
    }
});
// Obtener anuncios
exports.getAnnouncements = (0, https_1.onCall)(async (request) => {
    const { tenantId, activeOnly } = request.data;
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
            .collection('announcements')
            .orderBy('createdAt', 'desc');
        if (activeOnly) {
            query = query.where('isActive', '==', true);
        }
        const snapshot = await query.limit(100).get();
        const announcements = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { startDate: (_a = data.startDate) === null || _a === void 0 ? void 0 : _a.toDate(), endDate: (_b = data.endDate) === null || _b === void 0 ? void 0 : _b.toDate(), createdAt: (_c = data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate(), updatedAt: (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate() });
        });
        return { announcements };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener anuncios: ${error.message}`);
    }
});
// Obtener anuncios activos
exports.getActiveAnnouncements = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const now = new Date();
        const snapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('announcements')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const announcements = snapshot.docs
            .map((doc) => {
            var _a, _b, _c;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { startDate: (_a = data.startDate) === null || _a === void 0 ? void 0 : _a.toDate(), endDate: (_b = data.endDate) === null || _b === void 0 ? void 0 : _b.toDate(), createdAt: (_c = data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate() });
        })
            .filter((announcement) => {
            var _a;
            // Filtrar por fecha si aplica
            if (announcement.startDate && announcement.startDate > now)
                return false;
            if (announcement.endDate && announcement.endDate < now)
                return false;
            // Filtrar por destinatarios
            if (announcement.targetType === 'selected' && announcement.targetUserIds) {
                if (!announcement.targetUserIds.includes(userId || auth.uid))
                    return false;
            }
            // Filtrar los que ya fueron descartados
            if ((_a = announcement.dismissedBy) === null || _a === void 0 ? void 0 : _a.includes(userId || auth.uid))
                return false;
            return true;
        });
        return { announcements };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener anuncios activos: ${error.message}`);
    }
});
// Descartar anuncio
exports.dismissAnnouncement = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, announcementId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !announcementId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y announcementId son requeridos');
    }
    try {
        const announcementRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('announcements')
            .doc(announcementId);
        const announcementDoc = await announcementRef.get();
        if (!announcementDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Anuncio no encontrado');
        }
        const dismissedBy = ((_a = announcementDoc.data()) === null || _a === void 0 ? void 0 : _a.dismissedBy) || [];
        if (!dismissedBy.includes(auth.uid)) {
            dismissedBy.push(auth.uid);
            await announcementRef.update({
                dismissedBy,
                updatedAt: new Date(),
            });
        }
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al descartar anuncio: ${error.message}`);
    }
});
// Actualizar anuncio
exports.updateAnnouncement = (0, https_1.onCall)(async (request) => {
    const { tenantId, announcementId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !announcementId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, announcementId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('announcements')
            .doc(announcementId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar anuncio: ${error.message}`);
    }
});
// Eliminar anuncio
exports.deleteAnnouncement = (0, https_1.onCall)(async (request) => {
    const { tenantId, announcementId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !announcementId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y announcementId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('announcements')
            .doc(announcementId)
            .delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar anuncio: ${error.message}`);
    }
});
// Helper para enviar notificaciones
async function sendAnnouncementNotifications(announcementId, tenantId, announcement) {
    var _a;
    let userIds = [];
    if (announcement.targetType === 'all') {
        const usersSnapshot = await db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .where('status', '==', 'active')
            .get();
        userIds = usersSnapshot.docs.map((doc) => doc.id);
    }
    else if (announcement.targetType === 'selected' && announcement.targetUserIds) {
        userIds = announcement.targetUserIds;
    }
    userIds = Array.from(new Set(userIds));
    for (const userId of userIds) {
        try {
            await (0, core_1.createNotification)({
                tenantId,
                userId,
                type: 'announcement',
                title: announcement.title,
                message: ((_a = announcement.content) === null || _a === void 0 ? void 0 : _a.substring(0, 200)) || '',
                channels: ['system'],
                metadata: {
                    announcementId,
                    contentType: announcement.contentType,
                    mediaUrl: announcement.mediaUrl,
                    priority: announcement.priority,
                },
            });
        }
        catch (error) {
            console.warn(`Error sending notification to user ${userId}:`, error);
        }
    }
}
//# sourceMappingURL=announcements.js.map