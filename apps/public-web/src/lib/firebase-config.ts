// Configuración de Firebase para el cliente
// No interceptar errores globales de Auth: rompe el flujo de login y oculta fallos reales.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseWebClientConfig } from '@autodealers/shared/firebase-web-client-config';

function trimMeasurementId(v: string | undefined, fallback: string): string {
  const t = (v ?? '').trim().replace(/\r|\n/g, '');
  return t || fallback;
}

const base = getFirebaseWebClientConfig();

export const firebaseConfig = {
  ...base,
  measurementId: trimMeasurementId(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, 'G-411Q33HFJF'),
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

if (typeof window !== 'undefined') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

export const auth = authInstance!;
export const db = dbInstance!;
