/**
 * Configuración del SDK web de Firebase desde NEXT_PUBLIC_FIREBASE_*.
 * Valores por defecto = los que el monorepo usaba antes en código fijo (proyecto AutoDealers),
 * para no romper builds si falta .env.
 */
export const AUTODEALERS_FIREBASE_WEB_DEFAULTS = {
  apiKey: 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  authDomain: 'autodealers-7f62e.firebaseapp.com',
  projectId: 'autodealers-7f62e',
  storageBucket: 'autodealers-7f62e.firebasestorage.app',
  messagingSenderId: '857179023916',
  appId: '1:857179023916:web:6919fe5ae77f78d3b1bf89',
} as const;

export type FirebaseWebClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function trimEnv(v: string | undefined, fallback: string): string {
  const t = (v ?? '').trim().replace(/\r|\n/g, '');
  return t || fallback;
}

function sanitizeAuthDomain(raw: string | undefined, fallback: string): string {
  let d = trimEnv(raw, fallback);
  d = d.replace(/^https?:\/\//i, '');
  d = d.split('/')[0] ?? d;
  return d.trim() || fallback;
}

/**
 * @param defaults - Sustituye todos los valores por defecto (p. ej. otro proyecto Firebase).
 */
export function getFirebaseWebClientConfig(
  defaults: FirebaseWebClientConfig = AUTODEALERS_FIREBASE_WEB_DEFAULTS
): FirebaseWebClientConfig {
  return {
    apiKey: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, defaults.apiKey),
    authDomain: sanitizeAuthDomain(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, defaults.authDomain),
    projectId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, defaults.projectId),
    storageBucket: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, defaults.storageBucket),
    messagingSenderId: trimEnv(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      defaults.messagingSenderId
    ),
    appId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, defaults.appId),
  };
}
