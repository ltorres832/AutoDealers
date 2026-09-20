// Wrapper de fetch: usa token fresco sin borrar la cookie (evita redirects a /login).

import { auth } from './firebase-client';
import { DEALER_ACTIVE_TENANT_KEY } from './dealer-tenant-storage';
import { resolveClientAuthToken } from './auth-token-client';

function headerBagWithAuth(base: HeadersInit | undefined, token: string): Headers {
  const headers = new Headers(base);
  headers.set('Authorization', `Bearer ${token}`);
  if (typeof window !== 'undefined') {
    try {
      const active = sessionStorage.getItem(DEALER_ACTIVE_TENANT_KEY)?.trim();
      if (active) {
        headers.set('X-Dealer-Tenant-Id', active);
      }
    } catch {
      // ignore
    }
  }
  return headers;
}

function writeAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  const cookieValue = encodeURIComponent(token);
  // Sobrescribir sin borrar antes: borrar deja una ventana sin cookie → middleware manda a /login
  document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  try {
    localStorage.setItem('authToken', token);
  } catch {
    // ignore
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function waitForFirebaseUser(timeoutMs = 5000): Promise<import('firebase/auth').User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const { onAuthStateChanged } = require('firebase/auth') as typeof import('firebase/auth');
    let done = false;
    const unsubscribe = onAuthStateChanged(auth!, (u) => {
      if (done) return;
      done = true;
      unsubscribe();
      resolve(u);
    });
    setTimeout(() => {
      if (done) return;
      done = true;
      unsubscribe();
      resolve(auth?.currentUser ?? null);
    }, timeoutMs);
  });
}

/**
 * Obtiene un ID token. Por defecto no fuerza renovación (Firebase cachea ~1h).
 * Serializa refreshes concurrentes para no pisar la cookie en paralelo.
 */
export async function getFreshToken(force = false): Promise<string | null> {
  if (refreshPromise && force) {
    // Si ya hay un force en curso, esperar ese
  }

  const run = async (): Promise<string | null> => {
    try {
      if (!auth) return null;
      const user = await waitForFirebaseUser();
      if (!user) return null;

      const token = await user.getIdToken(force);
      if (!token || token.length < 200) return null;
      writeAuthCookie(token);
      return token;
    } catch (error) {
      console.error('Error al obtener token:', error);
      return null;
    }
  };

  if (!force) {
    // Reusar cookie/local si hay JWT válido; evita getIdToken(true) en cada request
    const existing = resolveClientAuthToken();
    if (existing) {
      // Refrescar en background suave (sin force) solo si Firebase ya está listo
      if (auth?.currentUser) {
        void auth.currentUser.getIdToken(false).then((t) => {
          if (t && t.length >= 200) writeAuthCookie(t);
        });
      }
      return existing;
    }
  }

  if (!refreshPromise) {
    refreshPromise = run().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Wrapper de fetch con Authorization. Solo fuerza renovación tras 401.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = await getFreshToken(false);

  if (!token) {
    token = await getFreshToken(true);
  }

  if (!token) {
    throw new Error('No se pudo obtener token de autenticación. Por favor, inicia sesión nuevamente.');
  }

  const headers = headerBagWithAuth(options.headers, token);

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isInternalChat = url.includes('/api/internal-chat/');

  if (response.status === 401) {
    const newToken = await getFreshToken(true);
    if (newToken) {
      const retryHeaders = headerBagWithAuth(options.headers, newToken);
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
    }

    if (isInternalChat) return response;

    if (response.status === 401) {
      throw new Error('Error de autenticación. Por favor, inicia sesión nuevamente.');
    }
  }

  return response;
}
