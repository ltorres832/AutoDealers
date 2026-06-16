/**
 * Interceptor global de fetch: Authorization + refresh de tokens expirados
 */
import { authHeaders } from './auth-token-client';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshTokenIfNeeded(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { getFreshToken } = await import('@/lib/fetch-with-auth');
      return await getFreshToken();
    } catch (error) {
      console.error('Error refreshing token in interceptor:', error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const withAuth = (base?: RequestInit): RequestInit => ({
      ...base,
      credentials: base?.credentials ?? 'include',
      headers: authHeaders(base?.headers),
    });

    let response = await originalFetch(input, withAuth(init));

    if (response.status === 401) {
      const newToken = await refreshTokenIfNeeded();
      if (newToken) {
        response = await originalFetch(input, withAuth(init));
      }
    }

    return response;
  };
}

export {};
