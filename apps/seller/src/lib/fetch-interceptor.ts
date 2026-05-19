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
      const { refreshAuthToken } = await import('@/lib/token-refresh');
      const newToken = await refreshAuthToken();
      
      if (newToken && newToken.length >= 200) {
        // Actualizar cookie con el nuevo token
        const isSecure = window.location.protocol === 'https:';
        const cookieValue = encodeURIComponent(newToken);
        document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        localStorage.setItem('authToken', newToken);
        console.log('✅ Token refrescado exitosamente en interceptor');
        return newToken;
      }
      return null;
    } catch (error) {
      console.error('❌ Error refreshing token in interceptor:', error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Solo ejecutar en el cliente
if (typeof window !== 'undefined') {
  // Guardar el fetch original
  const originalFetch = window.fetch;

  // Interceptar todas las llamadas fetch
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Si no es una petición a nuestra API, usar fetch normal
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const withAuth = (base?: RequestInit): RequestInit => ({
      ...base,
      credentials: base?.credentials ?? 'include',
      headers: authHeaders(base?.headers),
    });

    // Primera intento
    let response = await originalFetch(input, withAuth(init));

    // Si recibimos un 401, intentar refrescar el token y reintentar
    // EXCEPCIÓN: No redirigir para rutas del chat interno (polling)
    const isInternalChat = url.includes('/api/internal-chat/');
    
    if (response.status === 401) {
      const { resolveClientAuthToken } = await import('./auth-token-client');
      if (!resolveClientAuthToken()) {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        localStorage.removeItem('authToken');
      }

      // Para el chat interno, solo intentar refrescar pero NO redirigir
      if (isInternalChat) {
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Reintentar la petición con el nuevo token
          response = await originalFetch(input, withAuth(init));
        }
        // No redirigir para chat interno, solo retornar la respuesta
        return response;
      }
      
      console.log('🔄 Token expirado detectado en interceptor, refrescando...');
      
      const newToken = await refreshTokenIfNeeded();
      
      if (newToken) {
        // Reintentar la petición con el nuevo token
        response = await originalFetch(input, withAuth(init));
        
        // Si sigue siendo 401 después del refresh, el usuario necesita iniciar sesión
        if (response.status === 401) {
          console.warn('⚠️ Token refresh no resolvió el 401, redirigiendo al login');
          // Limpiar cookies y redirigir al login
          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/dealer; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // No se pudo refrescar el token, redirigir al login
        console.warn('⚠️ No se pudo refrescar el token en interceptor, redirigiendo al login');
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return response;
  };
}

// Exportar para uso explícito si es necesario
export {};
