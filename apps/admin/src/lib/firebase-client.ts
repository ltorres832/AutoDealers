// Firebase Client SDK para Admin App

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (typeof window !== 'undefined') {
  // Solo inicializar en el cliente
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  auth = getAuth(app);
} else {
  // En el servidor, usar valores dummy
  db = {} as Firestore;
  auth = {} as Auth;
}

export { db, auth };

// Funciones de chat público (stubs para compatibilidad)
export function subscribeToPublicChatConversations(
  tenantId: string,
  callback: (conversations: any[]) => void
): () => void {
  // Stub - implementar si es necesario
  return () => {};
}

export function subscribeToChatMessages(
  tenantId: string,
  sessionId: string,
  callback: (messages: any[]) => void
): () => void {
  // Stub - implementar si es necesario
  return () => {};
}

export function getFirebaseClient() {
  return { db, auth };
}
