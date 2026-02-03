/**
 * Wrapper para fetch que automáticamente incluye el token de autenticación
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Obtener token de localStorage o cookie
  let token = '';
  
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('authToken') || '';
    
    // Si no está en localStorage, intentar obtenerlo de las cookies
    if (!token) {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  // Agregar el token a los headers
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}


