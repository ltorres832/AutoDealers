// Firebase Client SDK para Admin App

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getFirebaseWebClientConfig } from '@autodealers/shared/firebase-web-client-config';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

const firebaseConfig = getFirebaseWebClientConfig();

if (typeof window !== 'undefined') {
  const hasWebConfig =
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId;

  if (getApps().length === 0) {
    if (hasWebConfig) {
      app = initializeApp(firebaseConfig);
    } else {
      console.error(
        '[admin] Falta NEXT_PUBLIC_FIREBASE_* en el bundle; Firebase cliente no se inicializó.'
      );
    }
  } else {
    app = getApps()[0];
  }

  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    db = {} as Firestore;
    auth = {} as Auth;
  }
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
