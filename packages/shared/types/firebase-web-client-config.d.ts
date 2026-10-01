/**
 * Configuración del SDK web de Firebase desde NEXT_PUBLIC_FIREBASE_*.
 * Valores por defecto = los que el monorepo usaba antes en código fijo (proyecto AutoDealers),
 * para no romper builds si falta .env.
 */
export declare const AUTODEALERS_FIREBASE_WEB_DEFAULTS: {
    readonly apiKey: "AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0";
    readonly authDomain: "autodealers-7f62e.firebaseapp.com";
    readonly projectId: "autodealers-7f62e";
    readonly storageBucket: "autodealers-7f62e.firebasestorage.app";
    readonly messagingSenderId: "857179023916";
    readonly appId: "1:857179023916:web:6919fe5ae77f78d3b1bf89";
};
export type FirebaseWebClientConfig = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
};
/**
 * @param defaults - Sustituye todos los valores por defecto (p. ej. otro proyecto Firebase).
 */
export declare function getFirebaseWebClientConfig(defaults?: FirebaseWebClientConfig): FirebaseWebClientConfig;
