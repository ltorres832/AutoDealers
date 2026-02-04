"use strict";
// Gestión de chat público (clientes desde página web)
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
exports.createPublicChatMessage = createPublicChatMessage;
exports.getPublicChatMessages = getPublicChatMessages;
exports.getPublicChatConversations = getPublicChatConversations;
exports.markPublicChatMessagesAsRead = markPublicChatMessagesAsRead;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea un mensaje de chat público
 */
async function createPublicChatMessage(tenantId, sessionId, clientName, clientEmail, clientPhone, fromClient, content, fromUserId, fromUserName, attachments) {
    try {
        console.log('💬 createPublicChatMessage:', { tenantId, sessionId, clientName, fromClient });
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('public_chat_messages')
            .doc();
        const messageData = {
            tenantId,
            sessionId,
            clientName,
            fromClient,
            content,
            attachments: attachments || [],
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Solo agregar campos si tienen valor (evitar undefined)
        if (clientEmail)
            messageData.clientEmail = clientEmail;
        if (clientPhone)
            messageData.clientPhone = clientPhone;
        if (fromUserId)
            messageData.fromUserId = fromUserId;
        if (fromUserName)
            messageData.fromUserName = fromUserName;
        await docRef.set(messageData);
        console.log('✅ Mensaje guardado:', docRef.id);
        // Si es del cliente, crear notificación para el dealer/vendedor
        if (fromClient) {
            try {
                // Obtener el tenant para notificar a todos los usuarios activos
                const tenantDoc = await db.collection('tenants').doc(tenantId).get();
                const tenantData = tenantDoc.data();
                // Notificar al dealer y vendedores
                const usersSnapshot = await db
                    .collection('users')
                    .where('tenantId', '==', tenantId)
                    .where('status', '==', 'active')
                    .get();
                for (const userDoc of usersSnapshot.docs) {
                    const userData = userDoc.data();
                    if (userData.role === 'dealer' || userData.role === 'seller') {
                        try {
                            await createNotification(tenantId, userDoc.id, {
                                type: 'public_chat',
                                title: 'Nuevo mensaje de cliente',
                                message: `${clientName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                                data: {
                                    messageId: docRef.id,
                                    sessionId,
                                    clientName,
                                },
                            });
                        }
                        catch (notifError) {
                            console.warn('⚠️ Error creando notificación:', notifError);
                            // Continuar aunque falle la notificación
                        }
                    }
                }
            }
            catch (notificationError) {
                console.warn('⚠️ Error en proceso de notificaciones:', notificationError);
                // Continuar aunque falle la notificación
            }
        }
        else if (fromUserId) {
            // Si es del vendedor/dealer, marcar como leído automáticamente
            try {
                await docRef.update({
                    read: true,
                    readAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch (updateError) {
                console.warn('⚠️ Error marcando como leído:', updateError);
                // Continuar aunque falle la actualización
            }
        }
        return {
            id: docRef.id,
            tenantId,
            sessionId,
            clientName,
            clientEmail,
            clientPhone,
            fromClient,
            fromUserId,
            fromUserName,
            content,
            attachments: attachments || [],
            read: false,
            createdAt: new Date(),
        };
    }
    catch (error) {
        console.error('❌ Error en createPublicChatMessage:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        throw error;
    }
}
/**
 * Obtiene mensajes de una sesión de chat público
 */
async function getPublicChatMessages(tenantId, sessionId) {
    try {
        console.log('🔍 getPublicChatMessages:', { tenantId, sessionId });
        const snapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('public_chat_messages')
            .where('sessionId', '==', sessionId)
            .orderBy('createdAt', 'asc')
            .get();
        console.log('✅ Mensajes encontrados:', snapshot.size);
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data?.createdAt?.toDate() || new Date(),
                readAt: data?.readAt?.toDate(),
            };
        });
    }
    catch (error) {
        console.error('❌ Error en getPublicChatMessages:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        throw error;
    }
}
/**
 * Obtiene todas las conversaciones de chat público para un tenant
 */
async function getPublicChatConversations(tenantId) {
    // Obtener todos los mensajes del tenant
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .orderBy('createdAt', 'desc')
        .get();
    const conversationsMap = {};
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const sessionId = data.sessionId;
        if (!conversationsMap[sessionId]) {
            conversationsMap[sessionId] = {
                sessionId,
                clientName: data.clientName || 'Cliente',
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone,
                lastMessage: null,
                unreadCount: 0,
                createdAt: data?.createdAt?.toDate() || new Date(),
            };
        }
        const message = {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            readAt: data?.readAt?.toDate(),
        };
        if (!conversationsMap[sessionId].lastMessage ||
            message.createdAt > conversationsMap[sessionId].lastMessage.createdAt) {
            conversationsMap[sessionId].lastMessage = message;
        }
        if (data.fromClient && !data.read) {
            conversationsMap[sessionId].unreadCount++;
        }
    });
    return Object.values(conversationsMap);
}
/**
 * Marca mensajes de una sesión como leídos
 */
async function markPublicChatMessagesAsRead(tenantId, sessionId, userId) {
    const batch = db.batch();
    const unreadMessages = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .where('sessionId', '==', sessionId)
        .where('fromClient', '==', true)
        .where('read', '==', false)
        .get();
    unreadMessages.docs.forEach((doc) => {
        batch.update(doc.ref, {
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
}
/**
 * Crea una notificación
 */
async function createNotification(tenantId, userId, notification) {
    const notificationRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('notifications')
        .doc();
    await notificationRef.set({
        userId,
        ...notification,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=public-chat.js.map