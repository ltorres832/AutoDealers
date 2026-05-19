/**
 * Inyecta Authorization en todas las peticiones /api/ del panel admin.
 */
import { authHeaders } from './auth-token-client';

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!url.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const headers = authHeaders(init?.headers);
    return originalFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
    });
  };
}

export {};
