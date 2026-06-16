"use strict";
/**
 * Cloud Functions para Public Chat
 *
 * Funcionalidades:
 * - Gestión de conversaciones de chat público
 * - Envío y recepción de mensajes
 * - Marcado de mensajes como leídos
 */
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
exports.markPublicChatMessagesAsRead = exports.replyPublicChatMessage = exports.sendPublicChatMessage = exports.getPublicChatMessages = exports.getPublicChatConversations = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener conversaciones de chat público
 */
exports.getPublicChatConversations = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    // Obtener todas las sesiones únicas con sus últimos mensajes
    const messagesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .orderBy('createdAt', 'desc')
        .get();
    // Agrupar por sessionId
    const conversationsMap = new Map();
    messagesSnapshot.docs.forEach((doc) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const data = doc.data();
        const sessionId = data.sessionId;
        if (!conversationsMap.has(sessionId)) {
            conversationsMap.set(sessionId, {
                sessionId,
                clientName: data.clientName || 'Cliente',
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone,
                lastMessage: {
                    id: doc.id,
                    content: data.content,
                    fromClient: data.fromClient,
                    createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt,
                },
                createdAt: ((_d = (_c = data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.createdAt,
                unreadCount: 0,
            });
        }
        else {
            const conv = conversationsMap.get(sessionId);
            if (!conv.lastMessage || (((_f = (_e = data.createdAt) === null || _e === void 0 ? void 0 : _e.toDate) === null || _f === void 0 ? void 0 : _f.call(_e)) || data.createdAt) > conv.lastMessage.createdAt) {
                conv.lastMessage = {
                    id: doc.id,
                    content: data.content,
                    fromClient: data.fromClient,
                    createdAt: ((_h = (_g = data.createdAt) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) || data.createdAt,
                };
            }
        }
    });
    const conversations = Array.from(conversationsMap.values());
    conversations.sort((a, b) => {
        var _a, _b;
        const aTime = ((_a = a.lastMessage) === null || _a === void 0 ? void 0 : _a.createdAt) instanceof Date ? a.lastMessage.createdAt.getTime() : 0;
        const bTime = ((_b = b.lastMessage) === null || _b === void 0 ? void 0 : _b.createdAt) instanceof Date ? b.lastMessage.createdAt.getTime() : 0;
        return bTime - aTime;
    });
    return { conversations };
});
/**
 * Obtener mensajes de una conversación
 */
exports.getPublicChatMessages = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, sessionId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .where('sessionId', '==', sessionId);
    try {
        const snapshot = await query.orderBy('createdAt', 'asc').get();
        const messages = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d;
            const data = doc.data();
            return {
                id: doc.id,
                content: data.content,
                fromClient: data.fromClient || false,
                clientName: data.clientName,
                createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt,
                readAt: ((_d = (_c = data.readAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.readAt,
            };
        });
        return { messages };
    }
    catch (error) {
        if (error.code === 'failed-precondition') {
            // Índice faltante, obtener sin orderBy
            const snapshot = await query.get();
            const messages = snapshot.docs.map((doc) => {
                var _a, _b, _c, _d;
                const data = doc.data();
                return {
                    id: doc.id,
                    content: data.content,
                    fromClient: data.fromClient || false,
                    clientName: data.clientName,
                    createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt,
                    readAt: ((_d = (_c = data.readAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.readAt,
                };
            });
            messages.sort((a, b) => {
                const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return aTime - bTime;
            });
            return { messages };
        }
        throw new https_1.HttpsError('internal', `Error al obtener mensajes: ${error.message}`);
    }
});
/**
 * Enviar mensaje de chat público (desde cliente)
 */
exports.sendPublicChatMessage = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { tenantId, sessionId, clientName, clientEmail, clientPhone, content } = request.data;
    if (!tenantId || !sessionId || !clientName || !content) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const messageRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .doc();
    await messageRef.set({
        tenantId,
        sessionId,
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        content,
        fromClient: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Buscar vendedores activos para notificar
    const sellersSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('sub_users')
        .where('role', '==', 'seller')
        .where('status', '==', 'active')
        .limit(1)
        .get();
    let sellerId = null;
    if (!sellersSnapshot.empty) {
        sellerId = sellersSnapshot.docs[0].id;
    }
    else {
        const usersSnapshot = await db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .where('role', '==', 'seller')
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (!usersSnapshot.empty) {
            sellerId = usersSnapshot.docs[0].id;
        }
    }
    // Crear notificación si hay vendedor
    if (sellerId) {
        try {
            const { createNotification } = await Promise.resolve().then(() => __importStar(require('../notifications/notifications')));
            await createNotification({
                tenantId,
                userId: sellerId,
                type: 'message_received',
                title: 'Nuevo mensaje del chat público',
                message: `${clientName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                channels: ['system'],
                metadata: {
                    sessionId,
                    clientName,
                    clientEmail,
                    clientPhone,
                    messageId: messageRef.id,
                },
            });
        }
        catch (notifError) {
            console.warn('Error creando notificación:', notifError);
        }
    }
    // Crear respuesta automática si no hay vendedores
    if (!sellerId) {
        const autoResponseRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('public_chat_messages')
            .doc();
        await autoResponseRef.set({
            tenantId,
            sessionId,
            content: `Hola ${clientName}, gracias por contactarnos. Un vendedor se pondrá en contacto contigo pronto.`,
            fromClient: false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    const createdDoc = await messageRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: messageRef.id }, createdData), { createdAt: ((_b = (_a = createdData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || createdData.createdAt });
});
/**
 * Responder mensaje de chat público (desde admin/dealer/seller)
 */
exports.replyPublicChatMessage = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const { tenantId, sessionId, content } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !sessionId || !content) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(authToken.uid).get();
    const userData = userDoc.data();
    // Obtener información del cliente de la sesión
    const messagesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .where('sessionId', '==', sessionId)
        .limit(1)
        .get();
    let clientName = 'Cliente';
    let clientEmail;
    let clientPhone;
    if (!messagesSnapshot.empty) {
        const firstMessage = messagesSnapshot.docs[0].data();
        clientName = firstMessage.clientName || 'Cliente';
        clientEmail = firstMessage.clientEmail;
        clientPhone = firstMessage.clientPhone;
    }
    const messageRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .doc();
    await messageRef.set({
        tenantId,
        sessionId,
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        content,
        fromClient: false,
        sentBy: authToken.uid,
        sentByName: (userData === null || userData === void 0 ? void 0 : userData.name) || (userData === null || userData === void 0 ? void 0 : userData.email) || 'Usuario',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const createdDoc = await messageRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: messageRef.id }, createdData), { createdAt: ((_c = (_b = createdData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || createdData.createdAt });
});
/**
 * Marcar mensajes como leídos
 */
exports.markPublicChatMessagesAsRead = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, sessionId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const messagesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .where('sessionId', '==', sessionId)
        .where('fromClient', '==', true)
        .get();
    const batch = db.batch();
    messagesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data.readAt) {
            batch.update(doc.ref, {
                readAt: firestore_1.FieldValue.serverTimestamp(),
                readBy: authToken.uid,
            });
        }
    });
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=public-chat.js.map