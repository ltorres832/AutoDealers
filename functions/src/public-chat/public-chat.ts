/**
 * Cloud Functions para Public Chat
 * 
 * Funcionalidades:
 * - Gestión de conversaciones de chat público
 * - Envío y recepción de mensajes
 * - Marcado de mensajes como leídos
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Obtener conversaciones de chat público
 */
export const getPublicChatConversations = onCall(async (request) => {
  const { tenantId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  // Obtener todas las sesiones únicas con sus últimos mensajes
  const messagesSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('public_chat_messages')
    .orderBy('createdAt', 'desc')
    .get();

  // Agrupar por sessionId
  const conversationsMap = new Map<string, any>();

  messagesSnapshot.docs.forEach((doc) => {
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
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        },
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        unreadCount: 0,
      });
    } else {
      const conv = conversationsMap.get(sessionId)!;
      if (!conv.lastMessage || (data.createdAt?.toDate?.() || data.createdAt) > conv.lastMessage.createdAt) {
        conv.lastMessage = {
          id: doc.id,
          content: data.content,
          fromClient: data.fromClient,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
      }
    }
  });

  const conversations = Array.from(conversationsMap.values());
  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt instanceof Date ? a.lastMessage.createdAt.getTime() : 0;
    const bTime = b.lastMessage?.createdAt instanceof Date ? b.lastMessage.createdAt.getTime() : 0;
    return bTime - aTime;
  });

  return { conversations };
});

/**
 * Obtener mensajes de una conversación
 */
export const getPublicChatMessages = onCall(async (request) => {
  const { tenantId, sessionId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !sessionId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('public_chat_messages')
    .where('sessionId', '==', sessionId);

  try {
    const snapshot = await query.orderBy('createdAt', 'asc').get();
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        fromClient: data.fromClient || false,
        clientName: data.clientName,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        readAt: data.readAt?.toDate?.() || data.readAt,
      };
    });
    return { messages };
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      // Índice faltante, obtener sin orderBy
      const snapshot = await query.get();
      const messages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          fromClient: data.fromClient || false,
          clientName: data.clientName,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          readAt: data.readAt?.toDate?.() || data.readAt,
        };
      });
      messages.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });
      return { messages };
    }
    throw new HttpsError('internal', `Error al obtener mensajes: ${error.message}`);
  }
});

/**
 * Enviar mensaje de chat público (desde cliente)
 */
export const sendPublicChatMessage = onCall(async (request) => {
  const { tenantId, sessionId, clientName, clientEmail, clientPhone, content } = request.data;

  if (!tenantId || !sessionId || !clientName || !content) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
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
    createdAt: FieldValue.serverTimestamp(),
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

  let sellerId: string | null = null;
  if (!sellersSnapshot.empty) {
    sellerId = sellersSnapshot.docs[0].id;
  } else {
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
      const { createNotification } = await import('../notifications/notifications');
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
    } catch (notifError) {
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
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const createdDoc = await messageRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: messageRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
  };
});

/**
 * Responder mensaje de chat público (desde admin/dealer/seller)
 */
export const replyPublicChatMessage = onCall(async (request) => {
  const { tenantId, sessionId, content } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !sessionId || !content) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
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
  let clientEmail: string | undefined;
  let clientPhone: string | undefined;

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
    sentByName: userData?.name || userData?.email || 'Usuario',
    createdAt: FieldValue.serverTimestamp(),
  });

  const createdDoc = await messageRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: messageRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
  };
});

/**
 * Marcar mensajes como leídos
 */
export const markPublicChatMessagesAsRead = onCall(async (request) => {
  const { tenantId, sessionId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !sessionId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
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
        readAt: FieldValue.serverTimestamp(),
        readBy: authToken.uid,
      });
    }
  });

  await batch.commit();

  return { success: true };
});


