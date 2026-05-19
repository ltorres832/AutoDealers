/**
 * Wrapper para fetch que automáticamente incluye el token de autenticación
 */
import { authHeaders } from './auth-token-client';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: options.credentials ?? 'include',
    headers: authHeaders(options.headers),
  });
}


