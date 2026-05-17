// Configuración de Firebase Client para el Dealer
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseWebClientConfig } from '@autodealers/shared/firebase-web-client-config';

// Mismos valores por defecto que antes si no hay NEXT_PUBLIC_FIREBASE_* en .env
const firebaseConfig = getFirebaseWebClientConfig();

// Inicializar Firebase solo si no está inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

