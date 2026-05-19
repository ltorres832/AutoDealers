/**
 * Fetch wrapper que maneja automáticamente el refresh de tokens expirados
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
        const cookieValue = encodeURIComponent(newToken);
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        localStorage.setItem('authToken', newToken);
        return newToken;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const withAuth = (): RequestInit => ({
    ...options,
    credentials: options.credentials ?? 'include',
    headers: authHeaders(options.headers),
  });

  // Primera intento
  let response = await fetch(url, withAuth());

  // Si recibimos un 401, intentar refrescar el token y reintentar
  // EXCEPCIÓN: No redirigir para rutas del chat interno (polling)
  const isInternalChat = url.includes('/api/internal-chat/');
  
  if (response.status === 401) {
    // Para el chat interno, solo intentar refrescar pero NO redirigir
    if (isInternalChat) {
      const newToken = await refreshTokenIfNeeded();
      if (newToken) {
        // Reintentar la petición con el nuevo token
        response = await fetch(url, withAuth());
      }
      // No redirigir para chat interno, solo retornar la respuesta
      return response;
    }
    
    console.log('🔄 Token expirado, refrescando...');
    
    const newToken = await refreshTokenIfNeeded();
    
    if (newToken) {
      // Reintentar la petición con el nuevo token
      response = await fetch(url, withAuth());
      
      // Si sigue siendo 401 después del refresh, el usuario necesita iniciar sesión
      if (response.status === 401) {
        console.warn('⚠️ Token refresh no resolvió el 401, redirigiendo al login');
        // Limpiar cookies y redirigir al login
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else {
      // No se pudo refrescar el token, redirigir al login
      console.warn('⚠️ No se pudo refrescar el token, redirigiendo al login');
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}

