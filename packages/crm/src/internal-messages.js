"use strict";
// Gestión de mensajes internos (dealer <-> sellers)
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
exports.createInternalMessage = createInternalMessage;
exports.getInternalMessages = getInternalMessages;
exports.getInternalConversations = getInternalConversations;
exports.markInternalMessagesAsRead = markInternalMessagesAsRead;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, core_1.getFirestore)();
}
/**
 * Crea un mensaje interno
 */
async function createInternalMessage(tenantId, fromUserId, fromUserName, toUserId, toUserName, content, attachments) {
    try {
        const db = getDb();
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('internal_messages')
            .doc();
        const messageData = {
            tenantId,
            fromUserId,
            fromUserName,
            toUserId,
            toUserName,
            content,
            attachments: attachments || [],
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(messageData);
        console.log('✅ Mensaje interno guardado en Firestore:', {
            messageId: docRef.id,
            tenantId,
            fromUserId,
            toUserId,
            contentLength: content.length,
        });
        // Crear notificación (no bloquear si falla)
        try {
            const notificationsModule = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
            if (notificationsModule.createNotification) {
                await notificationsModule.createNotification({
                    tenantId,
                    userId: toUserId,
                    type: 'message_received',
                    title: 'Nuevo mensaje',
                    message: `${fromUserName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                    channels: ['system'],
                    metadata: {
                        messageId: docRef.id,
                        fromUserId,
                    },
                });
            }
        }
        catch (notifError) {
            console.warn('⚠️ Error creando notificación (no crítico):', notifError.message);
        }
        return {
            id: docRef.id,
            tenantId,
            fromUserId,
            fromUserName,
            toUserId,
            toUserName,
            content,
            attachments: attachments || [],
            read: false,
            createdAt: new Date(),
        };
    }
    catch (error) {
        console.error('❌ Error creando mensaje interno:', error.message || error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
}
/**
 * Obtiene mensajes internos entre dos usuarios
 */
async function getInternalMessages(tenantId, userId1, userId2) {
    try {
        const db = getDb();
        // Intentar obtener mensajes con orderBy primero
        let messages1;
        let messages2;
        try {
            [messages1, messages2] = await Promise.all([
                db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('internal_messages')
                    .where('fromUserId', '==', userId1)
                    .where('toUserId', '==', userId2)
                    .orderBy('createdAt', 'asc')
                    .get(),
                db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('internal_messages')
                    .where('fromUserId', '==', userId2)
                    .where('toUserId', '==', userId1)
                    .orderBy('createdAt', 'asc')
                    .get(),
            ]);
        }
        catch (orderError) {
            // Si falla por falta de índice, obtener sin orderBy
            if (orderError.code === 9 || orderError.message?.includes('index')) {
                // Logging reducido - solo en desarrollo y solo ocasionalmente
                if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
                    console.warn('⚠️ Índice faltante para internal_messages, obteniendo sin orderBy...');
                }
                [messages1, messages2] = await Promise.all([
                    db
                        .collection('tenants')
                        .doc(tenantId)
                        .collection('internal_messages')
                        .where('fromUserId', '==', userId1)
                        .where('toUserId', '==', userId2)
                        .get(),
                    db
                        .collection('tenants')
                        .doc(tenantId)
                        .collection('internal_messages')
                        .where('fromUserId', '==', userId2)
                        .where('toUserId', '==', userId1)
                        .get(),
                ]);
            }
            else {
                throw orderError;
            }
        }
        const allMessages = [
            ...messages1.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data?.createdAt?.toDate() || new Date(),
                    readAt: data?.readAt?.toDate(),
                };
            }),
            ...messages2.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data?.createdAt?.toDate() || new Date(),
                    readAt: data?.readAt?.toDate(),
                };
            }),
        ];
        // Ordenar por fecha manualmente
        return allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    catch (error) {
        console.error('❌ Error obteniendo mensajes internos:', error);
        throw error;
    }
}
/**
 * Obtiene conversaciones de un usuario
 */
async function getInternalConversations(tenantId, userId) {
    const db = getDb();
    let sentMessages;
    let receivedMessages;
    try {
        // Intentar obtener con orderBy primero
        [sentMessages, receivedMessages] = await Promise.all([
            db
                .collection('tenants')
                .doc(tenantId)
                .collection('internal_messages')
                .where('fromUserId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get(),
            db
                .collection('tenants')
                .doc(tenantId)
                .collection('internal_messages')
                .where('toUserId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get(),
        ]);
    }
    catch (orderError) {
        // Si falla por falta de índice, obtener sin orderBy
        if (orderError.code === 9 || orderError.message?.includes('index')) {
            // Logging reducido - solo en desarrollo
            if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Índice faltante para internal_messages conversations, obteniendo sin orderBy...');
            }
            [sentMessages, receivedMessages] = await Promise.all([
                db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('internal_messages')
                    .where('fromUserId', '==', userId)
                    .get(),
                db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('internal_messages')
                    .where('toUserId', '==', userId)
                    .get(),
            ]);
        }
        else {
            throw orderError;
        }
    }
    const conversationsMap = {};
    // Procesar mensajes enviados
    sentMessages.docs.forEach((doc) => {
        const data = doc.data();
        const otherUserId = data.toUserId;
        if (!conversationsMap[otherUserId]) {
            conversationsMap[otherUserId] = {
                otherUserId,
                otherUserName: data.toUserName || 'Usuario',
                lastMessage: null,
                unreadCount: 0,
            };
        }
        const message = {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            readAt: data?.readAt?.toDate(),
        };
        if (!conversationsMap[otherUserId].lastMessage ||
            message.createdAt > conversationsMap[otherUserId].lastMessage.createdAt) {
            conversationsMap[otherUserId].lastMessage = message;
        }
    });
    // Procesar mensajes recibidos
    receivedMessages.docs.forEach((doc) => {
        const data = doc.data();
        const otherUserId = data.fromUserId;
        if (!conversationsMap[otherUserId]) {
            conversationsMap[otherUserId] = {
                otherUserId,
                otherUserName: data.fromUserName || 'Usuario',
                lastMessage: null,
                unreadCount: 0,
            };
        }
        const message = {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            readAt: data?.readAt?.toDate(),
        };
        if (!conversationsMap[otherUserId].lastMessage ||
            message.createdAt > conversationsMap[otherUserId].lastMessage.createdAt) {
            conversationsMap[otherUserId].lastMessage = message;
        }
        if (!data.read) {
            conversationsMap[otherUserId].unreadCount++;
        }
    });
    // Ordenar conversaciones por fecha del último mensaje (más reciente primero)
    const conversations = Object.values(conversationsMap);
    conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage)
            return 0;
        if (!a.lastMessage)
            return 1;
        if (!b.lastMessage)
            return -1;
        return b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();
    });
    return conversations;
}
/**
 * Marca mensajes como leídos
 */
async function markInternalMessagesAsRead(tenantId, fromUserId, toUserId) {
    const db = getDb();
    const batch = db.batch();
    const unreadMessages = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('internal_messages')
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUserId)
        .where('read', '==', false)
        .get();
    if (unreadMessages.empty) {
        return;
    }
    unreadMessages.docs.forEach((doc) => {
        batch.update(doc.ref, {
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
}
//# sourceMappingURL=internal-messages.js.map