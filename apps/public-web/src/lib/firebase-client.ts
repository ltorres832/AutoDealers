// Firebase Client SDK para tiempo real
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseWebClientConfig } from '@autodealers/shared/firebase-web-client-config';
import { db as existingDb } from './firebase-config';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let initializationError: Error | null = null;

export function getFirebaseClient(): { app: FirebaseApp; db: Firestore } | null {
  if (dbInstance) {
    if (!app) {
      app = getApps()[0];
    }
    return { app: app!, db: dbInstance };
  }

  if (existingDb) {
    dbInstance = existingDb;
    app = getApps()[0];
    return { app: app!, db: dbInstance };
  }

  if (initializationError) {
    return null;
  }

  try {
    const firebaseConfig = getFirebaseWebClientConfig();

    if (!firebaseConfig.projectId) {
      initializationError = new Error('Firebase project ID is required');
      return null;
    }

    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    dbInstance = getFirestore(app);
    return { app, db: dbInstance };
  } catch (error: unknown) {
    initializationError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
}

export { existingDb as db };

export interface PublicChatMessageRow {
  id: string;
  content: string;
  fromClient: boolean;
  createdAt: string;
}

function mapChatDoc(doc: { id: string; data: () => Record<string, unknown> }): PublicChatMessageRow {
  const data = doc.data();
  const createdAtRaw = data.createdAt as { toDate?: () => Date } | Date | undefined;
  const createdAt =
    createdAtRaw && typeof createdAtRaw === 'object' && 'toDate' in createdAtRaw && createdAtRaw.toDate
      ? createdAtRaw.toDate()!.toISOString()
      : new Date().toISOString();

  return {
    id: doc.id,
    content: String(data.content || ''),
    fromClient: data.fromClient === true,
    createdAt,
  };
}

export function subscribeToChatMessages(
  tenantId: string,
  sessionId: string,
  callback: (messages: PublicChatMessageRow[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const client = getFirebaseClient();
  if (!client) {
    return null;
  }

  const { db } = client;
  const messagesRef = collection(db, 'tenants', tenantId, 'public_chat_messages');
  const q = query(
    messagesRef,
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map(mapChatDoc));
    },
    (error) => {
      console.error('Error en listener de chat:', error);
      onError?.(error);
    }
  );
}

export function subscribeToNotifications(
  tenantId: string,
  userId: string,
  callback: (notifications: Record<string, unknown>[]) => void
): Unsubscribe | null {
  const client = getFirebaseClient();
  if (!client) {
    return null;
  }

  const { db } = client;
  const notificationsRef = collection(db, 'tenants', tenantId, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt:
          doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        readAt: doc.data().readAt?.toDate?.()?.toISOString(),
      }));
      callback(notifications);
    },
    (error) => {
      console.error('Error en listener de notificaciones:', error);
    }
  );
}
