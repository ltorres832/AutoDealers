// Gestión de mensajes

import { Message } from './types';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// Lazy initialization
function getDb() {
  return getFirestore();
}

/**
 * Crea un nuevo mensaje en el CRM
 */
export async function createMessage(
  messageData: Omit<Message, 'id' | 'createdAt'>
): Promise<Message> {
  const db = getDb();
  const docRef = db
    .collection('tenants')
    .doc(messageData.tenantId)
    .collection('messages')
    .doc();

  await docRef.set({
    ...messageData,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  } as any);

  const newMessage: Message = {
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
        const { getLeadById } = await import('./leads');
        const lead = await getLeadById(messageData.tenantId, messageData.leadId);
        if (lead) {
          leadInfo = ` de ${lead.contact.name} (${lead.contact.phone})`;
        }
      }

      const { notifyManagersAndAdmins, notifyUser } = await import('@autodealers/core');
      const metadata = {
        messageId: newMessage.id,
        leadId: messageData.leadId,
        channel: messageData.channel,
        from: messageData.from,
        content: messageData.content,
        route: messageData.leadId ? `/leads?leadId=${messageData.leadId}` : '/messages',
      };

      await notifyManagersAndAdmins(messageData.tenantId, {
        type: 'message_received',
        title: 'Nuevo Mensaje Recibido',
        message: `Nuevo mensaje${leadInfo} en ${messageData.channel}: ${messageData.content.substring(0, 100)}${messageData.content.length > 100 ? '...' : ''}`,
        metadata,
      });

      if (messageData.leadId) {
        const { getLeadById } = await import('./leads');
        const lead = await getLeadById(messageData.tenantId, messageData.leadId);
        if (lead?.assignedTo) {
          await notifyUser(messageData.tenantId, lead.assignedTo, {
            type: 'message_received',
            title: 'Nuevo mensaje en tu lead',
            message: `Mensaje${leadInfo} en ${messageData.channel}: ${messageData.content.substring(0, 80)}`,
            metadata,
          });
        }
      }
    } catch (error) {
      // No fallar si las notificaciones no están disponibles
      console.warn('Manager notification skipped for new message:', error);
    }
  }

  return newMessage;
}

/**
 * Obtiene un mensaje por ID
 */
export async function getMessageById(
  tenantId: string,
  messageId: string
): Promise<Message | null> {
  const db = getDb();
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
  } as Message;
}

/**
 * Obtiene mensajes de un lead
 */
export async function getLeadMessages(
  tenantId: string,
  leadId: string
): Promise<Message[]> {
  const db = getDb();
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
    } as Message;
  });
}

/**
 * Obtiene mensajes por canal
 */
export async function getMessagesByChannel(
  tenantId: string,
  channel: Message['channel'],
  limit?: number
): Promise<Message[]> {
  const db = getDb();
  let query: any = db
    .collection('tenants')
    .doc(tenantId)
    .collection('messages')
    .where('channel', '==', channel)
    .orderBy('createdAt', 'desc');

  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as Message;
  });
}

/**
 * Actualiza el estado de un mensaje
 */
export async function updateMessageStatus(
  tenantId: string,
  messageId: string,
  status: Message['status']
): Promise<void> {
  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('messages')
    .doc(messageId)
    .update({
      status,
    } as any);
}

