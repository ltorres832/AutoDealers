/**
 * Wrapper para fetch que automáticamente incluye el token de autenticación
 */
import { authHeaders } from './auth-token-client';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = authHeaders(options.headers);
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}


