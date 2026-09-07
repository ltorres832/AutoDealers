'use client';

import { getApps } from 'firebase/app';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebase-config';

let inFlight: Promise<boolean> | null = null;

export function isSalesFirebaseClientReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (getApps().length === 0) return false;
  return !!db && typeof (db as { type?: string }).type === 'string';
}

/**
 * Conecta Firebase Auth en el navegador usando la cookie HMAC de ventas.
 * Necesario para onSnapshot en sales_employee_* (reglas por claim sales_employee).
 */
export async function ensureSalesFirebaseClientAuth(): Promise<boolean> {
  if (!isSalesFirebaseClientReady()) return false;

  if (auth?.currentUser) {
    const claims = (await auth.currentUser.getIdTokenResult().catch(() => null))?.claims;
    if (claims?.role === 'sales_employee') return true;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    const res = await fetch('/api/sales/firebase-client-token', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[sales] firebase-client-token:', res.status);
      return false;
    }
    const data = (await res.json()) as {
      customToken?: string | null;
      fallback?: boolean;
    };
    if (data.fallback || !data.customToken || !auth) {
      console.warn('[sales] firebase-client-token: missing customToken');
      return false;
    }
    await signInWithCustomToken(auth, data.customToken);
    return true;
  })();

  try {
    return await inFlight;
  } catch (error) {
    console.error('[sales] ensureSalesFirebaseClientAuth:', error);
    return false;
  } finally {
    inFlight = null;
  }
}
