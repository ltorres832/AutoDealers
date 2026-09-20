'use client';

import { getApps } from 'firebase/app';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebase-client';
import { resolveClientAuthToken } from '@/lib/auth-token-client';

let inFlight: Promise<boolean> | null = null;

/** Firebase Client listo para onSnapshot (app inicializada y no es un stub vacío). */
export function isFirebaseClientReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (getApps().length === 0) return false;
  return !!db && typeof (db as { type?: string }).type === 'string';
}

/**
 * Conecta Firebase Auth en el navegador usando la sesión admin (cookie/localStorage).
 * Requerido para listeners Firestore (membresías, branding, etc.).
 */
export async function ensureFirebaseClientAuth(): Promise<boolean> {
  if (!isFirebaseClientReady()) {
    return false;
  }

  if (auth?.currentUser) {
    return true;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const sessionToken = resolveClientAuthToken();
    if (!sessionToken) return false;

    const res = await fetch('/api/auth/firebase-client-token', {
      credentials: 'include',
      headers: { Authorization: `Bearer ${sessionToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[admin] No se pudo obtener firebase-client-token:', res.status);
      return false;
    }

    const data = (await res.json()) as { customToken?: string };
    if (!data.customToken || !auth) return false;

    await signInWithCustomToken(auth, data.customToken);
    return true;
  })();

  try {
    return await inFlight;
  } catch (error) {
    console.error('[admin] ensureFirebaseClientAuth:', error);
    return false;
  } finally {
    inFlight = null;
  }
}
