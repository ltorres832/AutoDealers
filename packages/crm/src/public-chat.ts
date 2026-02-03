// Gestión de chat público (clientes desde página web)

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface PublicChatMessage {
  id: string;
  tenantId: string;
  sessionId: string; // ID de sesión del cliente
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  fromClient: boolean; // true si es del cliente, false si es del vendedor/dealer
  fromUserId?: string; // Si es del vendedor/dealer
  fromUserName?: string;
  content: string;
  attachments?: string[];
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Crea un mensaje de chat público
 */
export async function createPublicChatMessage(
  tenantId: string,
  sessionId: string,
  clientName: string,
  clientEmail: string | undefined,
  clientPhone: string | undefined,
  fromClient: boolean,
  content: string,
  fromUserId?: string,
  fromUserName?: string,
  attachments?: string[]
): Promise<PublicChatMessage> {
  try {
    console.log('💬 createPublicChatMessage:', { tenantId, sessionId, clientName, fromClient });
    
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('public_chat_messages')
      .doc();

    const messageData: any = {
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
    if (clientEmail) messageData.clientEmail = clientEmail;
    if (clientPhone) messageData.clientPhone = clientPhone;
    if (fromUserId) messageData.fromUserId = fromUserId;
    if (fromUserName) messageData.fromUserName = fromUserName;

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
            } catch (notifError) {
              console.warn('⚠️ Error creando notificación:', notifError);
              // Continuar aunque falle la notificación
            }
          }
        }
      } catch (notificationError) {
        console.warn('⚠️ Error en proceso de notificaciones:', notificationError);
        // Continuar aunque falle la notificación
      }
    } else if (fromUserId) {
      // Si es del vendedor/dealer, marcar como leído automáticamente
      try {
        await docRef.update({
          read: true,
          readAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
      } catch (updateError) {
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
  } catch (error: any) {
    console.error('❌ Error en createPublicChatMessage:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
}

/**
 * Obtiene mensajes de una sesión de chat público
 */
export async function getPublicChatMessages(
  tenantId: string,
  sessionId: string
): Promise<PublicChatMessage[]> {
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
      } as PublicChatMessage;
    });
  } catch (error: any) {
    console.error('❌ Error en getPublicChatMessages:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
}

/**
 * Obtiene todas las conversaciones de chat público para un tenant
 */
export async function getPublicChatConversations(
  tenantId: string
): Promise<Array<{
  sessionId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  lastMessage: PublicChatMessage | null;
  unreadCount: number;
  createdAt: Date;
}>> {
  // Obtener todos los mensajes del tenant
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('public_chat_messages')
    .orderBy('createdAt', 'desc')
    .get();

  const conversationsMap: Record<string, {
    sessionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    lastMessage: PublicChatMessage | null;
    unreadCount: number;
    createdAt: Date;
  }> = {};

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

    const message: PublicChatMessage = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      readAt: data?.readAt?.toDate(),
    } as PublicChatMessage;

    if (!conversationsMap[sessionId].lastMessage || 
        message.createdAt > conversationsMap[sessionId].lastMessage!.createdAt) {
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
export async function markPublicChatMessagesAsRead(
  tenantId: string,
  sessionId: string,
  userId: string
): Promise<void> {
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
    } as any);
  });

  await batch.commit();
}

/**
 * Crea una notificación
 */
async function createNotification(
  tenantId: string,
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }
): Promise<void> {
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
  } as any);
}



