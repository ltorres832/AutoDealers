import * as admin from 'firebase-admin';
/**
 * Inicializa Firebase Admin con manejo robusto de errores
 */
export declare function initializeFirebase(): admin.app.App;
/**
 * Obtiene la instancia de Firestore
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 * Configura ignoreUndefinedProperties para evitar errores con valores undefined
 */
export declare function getFirestore(): admin.firestore.Firestore;
/**
 * Obtiene la instancia de Auth
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
export declare function getAuth(): admin.auth.Auth;
/**
 * Obtiene la instancia de Storage
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
export declare function getStorage(): admin.storage.Storage;
declare const _default: {
    initializeFirebase: typeof initializeFirebase;
    getFirestore: typeof getFirestore;
    getAuth: typeof getAuth;
    getStorage: typeof getStorage;
};
export default _default;
//# sourceMappingURL=firebase.d.ts.map