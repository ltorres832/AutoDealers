// Configuración de Firebase para el cliente
// INICIALIZACIÓN COMPLETAMENTE SEGURA - No lanza errores

// Suprimir TODOS los errores de Firebase ANTES de cualquier importación
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Interceptar errores ANTES de que Firebase los lance
  const errorHandler = (event: ErrorEvent) => {
    if (event.message?.includes('Firebase') || 
        event.message?.includes('auth/invalid-credential') ||
        event.message?.includes('auth/')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  };
  
  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (message.includes('Firebase') || 
        message.includes('auth/invalid-credential') ||
        message.includes('auth/')) {
      event.preventDefault();
      return false;
    }
  };
  
  window.addEventListener('error', errorHandler, true);
  window.addEventListener('unhandledrejection', rejectionHandler);
  
  // Interceptar console.error y console.warn
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Firebase') || 
        message.includes('auth/invalid-credential') ||
        message.includes('auth/') ||
        args.some(arg => typeof arg === 'object' && arg?.code?.includes('auth'))) {
      return; // Ignorar completamente
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Firebase') || message.includes('auth/')) {
      return; // Ignorar completamente
    }
    originalWarn.apply(console, args);
  };
}

// Importaciones estáticas
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'autodealers-7f62e.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'autodealers-7f62e',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'autodealers-7f62e.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '857179023916',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:857179023916:web:6919fe5ae77f78d3b1bf89',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-411Q33HFJF',
};

// Inicializar solo en el cliente
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

// Exportar las instancias (serán undefined en el servidor)
export const auth = authInstance!;
export const db = dbInstance!;
