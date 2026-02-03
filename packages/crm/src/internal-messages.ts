// Gestión de mensajes internos (dealer <-> sellers)

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export interface InternalMessage {
  id: string;
  tenantId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  content: string;
  attachments?: string[];
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Crea un mensaje interno
 */
export async function createInternalMessage(
  tenantId: string,
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  content: string,
  attachments?: string[]
): Promise<InternalMessage> {
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

    await docRef.set(messageData as any);

    console.log('✅ Mensaje interno guardado en Firestore:', {
      messageId: docRef.id,
      tenantId,
      fromUserId,
      toUserId,
      contentLength: content.length,
    });

    // Crear notificación (no bloquear si falla)
    try {
      const notificationsModule = await import('@autodealers/core');
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
    } catch (notifError: any) {
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
  } catch (error: any) {
    console.error('❌ Error creando mensaje interno:', error.message || error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

/**
 * Obtiene mensajes internos entre dos usuarios
 */
export async function getInternalMessages(
  tenantId: string,
  userId1: string,
  userId2: string
): Promise<InternalMessage[]> {
  try {
    const db = getDb();
    // Intentar obtener mensajes con orderBy primero
    let messages1: admin.firestore.QuerySnapshot;
    let messages2: admin.firestore.QuerySnapshot;

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
    } catch (orderError: any) {
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
      } else {
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
        } as InternalMessage;
      }),
      ...messages2.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          readAt: data?.readAt?.toDate(),
        } as InternalMessage;
      }),
    ];

    // Ordenar por fecha manualmente
    return allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } catch (error: any) {
    console.error('❌ Error obteniendo mensajes internos:', error);
    throw error;
  }
}

/**
 * Obtiene conversaciones de un usuario
 */
export async function getInternalConversations(
  tenantId: string,
  userId: string
): Promise<Array<{
  otherUserId: string;
  otherUserName: string;
  lastMessage: InternalMessage | null;
  unreadCount: number;
}>> {
  const db = getDb();
  let sentMessages: admin.firestore.QuerySnapshot;
  let receivedMessages: admin.firestore.QuerySnapshot;

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
  } catch (orderError: any) {
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
    } else {
      throw orderError;
    }
  }

  const conversationsMap: Record<string, {
    otherUserId: string;
    otherUserName: string;
    lastMessage: InternalMessage | null;
    unreadCount: number;
  }> = {};

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
    const message: InternalMessage = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      readAt: data?.readAt?.toDate(),
    } as InternalMessage;
    if (!conversationsMap[otherUserId].lastMessage || 
        message.createdAt > conversationsMap[otherUserId].lastMessage!.createdAt) {
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
    const message: InternalMessage = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      readAt: data?.readAt?.toDate(),
    } as InternalMessage;
    if (!conversationsMap[otherUserId].lastMessage || 
        message.createdAt > conversationsMap[otherUserId].lastMessage!.createdAt) {
      conversationsMap[otherUserId].lastMessage = message;
    }
    if (!data.read) {
      conversationsMap[otherUserId].unreadCount++;
    }
  });

  // Ordenar conversaciones por fecha del último mensaje (más reciente primero)
  const conversations = Object.values(conversationsMap);
  conversations.sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();
  });

  return conversations;
}

/**
 * Marca mensajes como leídos
 */
export async function markInternalMessagesAsRead(
  tenantId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
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
    } as any);
  });

  await batch.commit();
}


