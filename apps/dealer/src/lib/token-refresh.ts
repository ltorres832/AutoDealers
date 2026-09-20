// Utilidad para renovar tokens de Firebase automáticamente

import { auth } from './firebase-client';

function writeAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  const cookieValue = encodeURIComponent(token);
  // Nunca borrar la cookie antes de escribir: causa redirects a /login en middleware
  document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  try {
    localStorage.setItem('authToken', token);
  } catch {
    // ignore
  }
}

/**
 * Obtiene un token fresco de Firebase Auth y actualiza la cookie (sin borrarla antes).
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    if (!auth || !auth.currentUser) {
      return null;
    }

    const token = await auth.currentUser.getIdToken(true);
    if (!token || token.length < 200) return null;
    writeAuthCookie(token);
    return token;
  } catch (error) {
    console.error('Error al renovar token:', error);
    return null;
  }
}

/**
 * Asegura un token usable. No fuerza renovación salvo que no haya usuario/cookie válida.
 */
export async function ensureFreshToken(): Promise<string | null> {
  try {
    if (!auth) return null;

    if (!auth.currentUser) {
      return new Promise((resolve) => {
        const { onAuthStateChanged } = require('firebase/auth');
        const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
          unsubscribe();
          if (user) {
            try {
              const token = await user.getIdToken(false);
              if (token && token.length >= 200) writeAuthCookie(token);
              resolve(token);
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
        setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 2000);
      });
    }

    const token = await auth.currentUser.getIdToken(false);
    if (!token || token.length < 200) return null;
    writeAuthCookie(token);
    return token;
  } catch (error) {
    console.error('Error al obtener token fresco:', error);
    return null;
  }
}
