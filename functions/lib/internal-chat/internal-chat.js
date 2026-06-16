"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMessagesAsRead = exports.getConversation = exports.sendInternalMessage = exports.getInternalChatUsers = void 0;
// Cloud Functions para Internal Chat
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Obtener usuarios para chat interno
exports.getInternalChatUsers = (0, https_1.onCall)(async (request) => {
    const { tenantId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const users = [];
        // Obtener usuarios de diferentes roles
        const rolesToFetch = ['seller', 'fi_manager', 'manager', 'dealer_admin'];
        for (const role of rolesToFetch) {
            try {
                const snapshot = await db
                    .collection('users')
                    .where('tenantId', '==', tenantId)
                    .where('role', '==', role)
                    .get();
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (doc.id !== auth.uid && (data.status === 'active' || !data.status)) {
                        if (!users.find((u) => u.id === doc.id || u.email === data.email)) {
                            users.push({
                                id: doc.id,
                                name: data.name || data.email,
                                email: data.email,
                                role: data.role || role,
                                status: data.status || 'active',
                                tenantId: data.tenantId || tenantId,
                            });
                        }
                    }
                });
            }
            catch (error) {
                console.warn(`Error obteniendo usuarios con rol ${role}:`, error);
            }
        }
        // Eliminar duplicados
        const uniqueUsers = Array.from(new Map(users.map((u) => [u.id || u.email, u])).values());
        // Ordenar por nombre
        uniqueUsers.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        return { users: uniqueUsers };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener usuarios: ${error.message}`);
    }
});
// Enviar mensaje interno
exports.sendInternalMessage = (0, https_1.onCall)(async (request) => {
    const { tenantId, toUserId, message, type } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !toUserId || !message) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, toUserId y message son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('internal_messages')
            .doc();
        await docRef.set({
            fromUserId: auth.uid,
            toUserId,
            message,
            type: type || 'text',
            read: false,
            createdAt: new Date(),
        });
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al enviar mensaje: ${error.message}`);
    }
});
// Obtener conversación
exports.getConversation = (0, https_1.onCall)(async (request) => {
    const { tenantId, otherUserId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !otherUserId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y otherUserId son requeridos');
    }
    try {
        // Obtener mensajes donde el usuario actual es remitente o destinatario
        const sentMessages = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('internal_messages')
            .where('fromUserId', '==', auth.uid)
            .where('toUserId', '==', otherUserId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const receivedMessages = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('internal_messages')
            .where('fromUserId', '==', otherUserId)
            .where('toUserId', '==', auth.uid)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const allMessages = [
            ...sentMessages.docs.map((doc) => {
                var _a;
                return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
            }),
            ...receivedMessages.docs.map((doc) => {
                var _a;
                return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
            }),
        ];
        // Ordenar por fecha
        allMessages.sort((a, b) => {
            var _a, _b;
            const dateA = ((_a = a.createdAt) === null || _a === void 0 ? void 0 : _a.millisecondsSinceEpoch) || 0;
            const dateB = ((_b = b.createdAt) === null || _b === void 0 ? void 0 : _b.millisecondsSinceEpoch) || 0;
            return dateA.compareTo(dateB);
        });
        return { messages: allMessages };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener conversación: ${error.message}`);
    }
});
// Marcar mensajes como leídos
exports.markMessagesAsRead = (0, https_1.onCall)(async (request) => {
    const { tenantId, fromUserId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fromUserId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y fromUserId son requeridos');
    }
    try {
        const snapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('internal_messages')
            .where('fromUserId', '==', fromUserId)
            .where('toUserId', '==', auth.uid)
            .where('read', '==', false)
            .get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true, readAt: new Date() });
        });
        await batch.commit();
        return { success: true, count: snapshot.size };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al marcar mensajes como leídos: ${error.message}`);
    }
});
//# sourceMappingURL=internal-chat.js.map