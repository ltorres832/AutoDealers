"use strict";
// Gestión de mensajes
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
exports.createMessage = createMessage;
exports.getMessageById = getMessageById;
exports.getLeadMessages = getLeadMessages;
exports.getMessagesByChannel = getMessagesByChannel;
exports.updateMessageStatus = updateMessageStatus;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea un nuevo mensaje en el CRM
 */
async function createMessage(messageData) {
    const docRef = db
        .collection('tenants')
        .doc(messageData.tenantId)
        .collection('messages')
        .doc();
    await docRef.set({
        ...messageData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const newMessage = {
        id: docRef.id,
        ...messageData,
        createdAt: new Date(),
    };
    // Notificar a gerentes y administradores sobre mensajes entrantes (asíncrono, no bloquea)
    if (messageData.direction === 'inbound') {
        try {
            // Obtener información del lead si existe
            let leadInfo = '';
            if (messageData.leadId) {
                const { getLeadById } = await Promise.resolve().then(() => __importStar(require('./leads')));
                const lead = await getLeadById(messageData.tenantId, messageData.leadId);
                if (lead) {
                    leadInfo = ` de ${lead.contact.name} (${lead.contact.phone})`;
                }
            }
            const { notifyManagersAndAdmins } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
            await notifyManagersAndAdmins(messageData.tenantId, {
                type: 'message_received',
                title: 'Nuevo Mensaje Recibido',
                message: `Nuevo mensaje${leadInfo} en ${messageData.channel}: ${messageData.content.substring(0, 100)}${messageData.content.length > 100 ? '...' : ''}`,
                metadata: {
                    messageId: newMessage.id,
                    leadId: messageData.leadId,
                    channel: messageData.channel,
                    from: messageData.from,
                    content: messageData.content,
                },
            });
        }
        catch (error) {
            // No fallar si las notificaciones no están disponibles
            console.warn('Manager notification skipped for new message:', error);
        }
    }
    return newMessage;
}
/**
 * Obtiene un mensaje por ID
 */
async function getMessageById(tenantId, messageId) {
    const messageDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .doc(messageId)
        .get();
    if (!messageDoc.exists) {
        return null;
    }
    const data = messageDoc.data();
    return {
        id: messageDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene mensajes de un lead
 */
async function getLeadMessages(tenantId, leadId) {
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .where('leadId', '==', leadId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene mensajes por canal
 */
async function getMessagesByChannel(tenantId, channel, limit) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .where('channel', '==', channel)
        .orderBy('createdAt', 'desc');
    if (limit) {
        query = query.limit(limit);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
        };
    });
}
/**
 * Actualiza el estado de un mensaje
 */
async function updateMessageStatus(tenantId, messageId, status) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .doc(messageId)
        .update({
        status,
    });
}
//# sourceMappingURL=messages.js.map