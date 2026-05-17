// Firebase Client SDK para tiempo real en advertiser
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFirebaseWebClientConfig } from '@autodealers/shared/firebase-web-client-config';

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

  if (initializationError) {
    return null;
  }

  try {
    const firebaseConfig = getFirebaseWebClientConfig();

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

// Export estable que usan los hooks
export const db = getFirebaseClient()?.db as Firestore;
