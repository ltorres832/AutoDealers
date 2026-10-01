/**
 * Obtiene la instancia de Firebase Admin de forma segura para el bundle del cliente
 */
declare function getAdmin(): any;
type AdminType = ReturnType<typeof getAdmin>;
/**
 * Inicializa Firebase Admin con manejo robusto de errores
 */
export declare function initializeFirebase(): AdminType['app']['App'];
/**
 * Obtiene la instancia de Firestore
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 * Configura ignoreUndefinedProperties para evitar errores con valores undefined
 */
export declare function getFirestore(): any;
/**
 * Obtiene la instancia de Auth
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
export declare function getAuth(): any;
/**
 * Obtiene la instancia de Storage
 * IMPORTANTE: NO lanza errores durante la importación, solo cuando se usa
 */
export declare function getStorage(): any;
/**
 * Obtiene el objeto FieldValue de Firestore para su uso en actualizaciones
 */
export declare function getFirestoreFieldValue(): any;
declare const _default: {
    initializeFirebase: typeof initializeFirebase;
    getFirestore: typeof getFirestore;
    getAuth: typeof getAuth;
    getStorage: typeof getStorage;
    getFirestoreFieldValue: typeof getFirestoreFieldValue;
};
export default _default;
