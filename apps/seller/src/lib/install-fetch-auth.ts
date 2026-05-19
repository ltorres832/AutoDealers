/**
 * Parchea fetch al cargar el módulo (antes de peticiones del panel vendedor).
 */
import { authHeaders } from './auth-token-client';

if (typeof window !== 'undefined' && !(window as unknown as { __sellerFetchAuth?: boolean }).__sellerFetchAuth) {
  (window as unknown as { __sellerFetchAuth?: boolean }).__sellerFetchAuth = true;
  const originalFetch = window.fetch.bind(window);

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

    return originalFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers: authHeaders(init?.headers),
    });
  };
}
