// Firebase Client SDK para tiempo real
import { db, auth } from './firebase-client-base';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

// Re-exportar auth para uso en otros archivos
export { auth, db };

function mapInternalMessageDoc(doc: { id: string; data: () => Record<string, unknown> }) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    readAt: (data.readAt as { toDate?: () => Date })?.toDate?.(),
  };
}

export function subscribeToInternalMessages(
  tenantId: string,
  currentUserId: string,
  otherUserId: string,
  callback: (messages: any[]) => void
): Unsubscribe | null {
  if (!db || !tenantId || !currentUserId || !otherUserId) return null;

  const ref = collection(db, 'tenants', tenantId, 'internal_messages');
  let sent: any[] = [];
  let received: any[] = [];

  const emit = () => {
    const merged = [...sent, ...received].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    callback(merged);
  };

  const qSent = query(
    ref,
    where('fromUserId', '==', currentUserId),
    where('toUserId', '==', otherUserId),
    orderBy('createdAt', 'asc')
  );
  const qReceived = query(
    ref,
    where('fromUserId', '==', otherUserId),
    where('toUserId', '==', currentUserId),
    orderBy('createdAt', 'asc')
  );

  const unsubSent = onSnapshot(
    qSent,
    (snapshot) => {
      sent = snapshot.docs.map((d) => mapInternalMessageDoc(d));
      emit();
    },
    (error) => console.error('Internal chat sent listener:', error)
  );

  const unsubReceived = onSnapshot(
    qReceived,
    (snapshot) => {
      received = snapshot.docs.map((d) => mapInternalMessageDoc(d));
      emit();
    },
    (error) => console.error('Internal chat received listener:', error)
  );

  return () => {
    unsubSent();
    unsubReceived();
  };
}

export function subscribeToInternalConversations(
  tenantId: string,
  currentUserId: string,
  callback: (conversations: any[]) => void
): Unsubscribe | null {
  if (!db || !tenantId || !currentUserId) return null;

  const ref = collection(db, 'tenants', tenantId, 'internal_messages');
  let sent: any[] = [];
  let received: any[] = [];

  const buildConversations = () => {
    const map = new Map<string, any>();

    const ingest = (msg: any, otherUserId: string, otherUserName: string) => {
      const existing = map.get(otherUserId);
      const msgTime = new Date(msg.createdAt).getTime();
      const unreadInc = msg.toUserId === currentUserId && !msg.read ? 1 : 0;

      if (!existing) {
        map.set(otherUserId, {
          userId: otherUserId,
          userName: otherUserName || 'Usuario',
          lastMessage: msg.content,
          lastMessageTime: new Date(msg.createdAt),
          unreadCount: unreadInc,
        });
        return;
      }

      if (msgTime >= existing.lastMessageTime.getTime()) {
        existing.lastMessage = msg.content;
        existing.lastMessageTime = new Date(msg.createdAt);
        existing.userName = otherUserName || existing.userName;
      }
      existing.unreadCount += unreadInc;
    };

    for (const msg of sent) {
      ingest(msg, msg.toUserId, msg.toUserName);
    }
    for (const msg of received) {
      ingest(msg, msg.fromUserId, msg.fromUserName);
    }

    callback(
      Array.from(map.values()).sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
      )
    );
  };

  const qSent = query(
    ref,
    where('fromUserId', '==', currentUserId),
    orderBy('createdAt', 'desc')
  );
  const qReceived = query(
    ref,
    where('toUserId', '==', currentUserId),
    orderBy('createdAt', 'desc')
  );

  const unsubSent = onSnapshot(
    qSent,
    (snapshot) => {
      sent = snapshot.docs.map((d) => mapInternalMessageDoc(d));
      buildConversations();
    },
    (error) => console.error('Internal conversations sent listener:', error)
  );

  const unsubReceived = onSnapshot(
    qReceived,
    (snapshot) => {
      received = snapshot.docs.map((d) => mapInternalMessageDoc(d));
      buildConversations();
    },
    (error) => console.error('Internal conversations received listener:', error)
  );

  return () => {
    unsubSent();
    unsubReceived();
  };
}

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
