// Firebase Client SDK para tiempo real
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db as existingDb } from './firebase-config';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let initializationError: Error | null = null;

export function getFirebaseClient(): { app: FirebaseApp; db: Firestore } | null {
  // Si ya tenemos una instancia de db, usarla
  if (dbInstance) {
    if (!app) {
      app = getApps()[0];
    }
    return { app: app!, db: dbInstance };
  }

  // Intentar usar la instancia existente de firebase-config.ts
  if (existingDb) {
    dbInstance = existingDb;
    app = getApps()[0];
    return { app: app!, db: dbInstance };
  }

  if (initializationError) {
    return null;
  }

  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    };

    if (!firebaseConfig.projectId) {
      console.warn('⚠️ Firebase Client no configurado. Usando polling.');
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
  } catch (error: any) {
    console.warn('⚠️ Error inicializando Firebase Client:', error);
    initializationError = error;
    return null;
  }
}

// Re-exportar db para compatibilidad con otros archivos
export { existingDb as db };

export function subscribeToChatMessages(
  tenantId: string,
  sessionId: string,
  callback: (messages: any[]) => void
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

export function subscribeToNotifications(
  tenantId: string,
  userId: string,
  callback: (notifications: any[]) => void
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

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      readAt: doc.data().readAt?.toDate()?.toISOString(),
    }));
    callback(notifications);
  }, (error) => {
    console.error('Error en listener de notificaciones:', error);
  });
}

