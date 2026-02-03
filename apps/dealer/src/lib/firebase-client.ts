// Firebase Client SDK para tiempo real
import { db, auth } from './firebase-client-base';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

// Re-exportar auth para uso en otros archivos
export { auth };

export function subscribeToChatMessages(
  tenantId: string,
  sessionId: string,
  callback: (messages: any[]) => void
): Unsubscribe | null {
  if (!db || !tenantId || !sessionId) {
    return null;
  }
  
  const messagesRef = collection(db, 'tenants', tenantId, 'public_chat_messages');
  const q = query(
    messagesRef,
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      readAt: doc.data().readAt?.toDate()?.toISOString(),
    }));
    callback(messages);
  }, (error) => {
    console.error('Error en listener de chat:', error);
  });
}

export function subscribeToPublicChatConversations(
  tenantId: string,
  callback: (conversations: any[]) => void
): Unsubscribe | null {
  if (!db || !tenantId) {
    return null;
  }
  
  const messagesRef = collection(db, 'tenants', tenantId, 'public_chat_messages');
  const q = query(
    messagesRef,
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversationsMap: Record<string, any> = {};
    
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
          createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        };
      }

      const message = {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      };

      if (!conversationsMap[sessionId].lastMessage || 
          message.createdAt > conversationsMap[sessionId].lastMessage.createdAt) {
        conversationsMap[sessionId].lastMessage = {
          ...message,
          content: (message as any).content || data.content || '',
        };
      }

      if (data.fromClient && !data.read) {
        conversationsMap[sessionId].unreadCount++;
      }
    });

    const conversations = Object.values(conversationsMap);
    callback(conversations);
  }, (error) => {
    console.error('Error en listener de conversaciones:', error);
  });
}
