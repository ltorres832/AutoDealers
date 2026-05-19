/**
 * Parchea fetch antes de cualquier petición del panel admin (importar al inicio del cliente).
 */
import { authHeaders } from './auth-token-client';

if (typeof window !== 'undefined' && !(window as unknown as { __adminFetchAuth?: boolean }).__adminFetchAuth) {
  (window as unknown as { __adminFetchAuth?: boolean }).__adminFetchAuth = true;
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

    if (!url.includes('/api')) {
      return originalFetch(input, init);
    }

    return originalFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers: authHeaders(init?.headers),
    });
  };
}
