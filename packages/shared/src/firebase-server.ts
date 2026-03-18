// Firebase Admin - Solo para uso en servidor
// Este archivo debe importarse solo en código del servidor (API routes, Server Components, etc.)
// Re-exporta desde firebase.ts para mantener compatibilidad

export { initializeFirebase, getFirestore, getAuth, getStorage } from './firebase';
