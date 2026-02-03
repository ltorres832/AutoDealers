// Configuración de Firebase Client para el Dealer
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración hardcoded para evitar problemas con variables de entorno
const firebaseConfig = {
  apiKey: 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  authDomain: 'autodealers-7f62e.firebaseapp.com',
  projectId: 'autodealers-7f62e',
  storageBucket: 'autodealers-7f62e.firebasestorage.app',
  messagingSenderId: '857179023916',
  appId: '1:857179023916:web:6919fe5ae77f78d3b1bf89',
};

// Inicializar Firebase solo si no está inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

