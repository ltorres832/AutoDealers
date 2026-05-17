// Cliente de autenticación: Identity Toolkit REST (mismo endpoint que el SDK, sin capas que fallen en hosted.app).
import type { User } from 'firebase/auth';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

function getAuthInstance() {
  const { auth } = require('./firebase-config');
  return auth;
}

/**
 * Login con email/contraseña vía REST (evita auth/network-request-failed del SDK en algunos entornos).
 */
export async function signIn(email: string, password: string) {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) {
    throw new Error('Firebase API key no configurada');
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = (await res.json().catch(() => ({}))) as {
    idToken?: string;
    localId?: string;
    email?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = String(data.error?.message || '');
    if (msg.includes('INVALID_PASSWORD') || msg.includes('EMAIL_NOT_FOUND')) {
      throw new Error('Firebase: Error (auth/invalid-credential).');
    }
    if (/API_KEY|API key|INVALID_KEY|invalid.?api.?key/i.test(msg)) {
      throw new Error('Firebase: Error (auth/invalid-api-key).');
    }
    throw new Error(msg ? `Firebase: ${msg}` : 'Error al iniciar sesión');
  }

  const idToken = data.idToken!;
  const uid = data.localId!;

  const user = {
    uid,
    email: data.email || email,
    getIdToken: async () => idToken,
  } as User;

  return { user, token: idToken };
}

export async function signOut() {
  try {
    const authInstance = getAuthInstance();
    if (!authInstance) return;
    await firebaseSignOut(authInstance);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al cerrar sesión';
    throw new Error(message);
  }
}
