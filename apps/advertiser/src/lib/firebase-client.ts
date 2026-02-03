// Firebase Client SDK para tiempo real en advertiser
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

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

// Export estable que usan los hooks
export const db = getFirebaseClient()?.db as Firestore;
