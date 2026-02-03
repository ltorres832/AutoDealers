/**
 * Script que se ejecuta inmediatamente para limpiar tokens inválidos
 * Se ejecuta ANTES de que React se monte
 */
if (typeof window !== 'undefined') {
  try {
    const cookies = document.cookie.split(';');
    const authTokenCookie = cookies.find(c => c.trim().startsWith('authToken='));
    
    if (authTokenCookie) {
      const tokenValue = decodeURIComponent(authTokenCookie.split('=')[1] || '');
      
      // Si el token es muy corto (< 200 caracteres), es de otra app
      if (tokenValue && tokenValue.length < 200) {
        try {
          const decoded = atob(tokenValue);
          const sessionData = JSON.parse(decoded);
          
          // Si es de advertiser u otra app, limpiarlo inmediatamente
          if (sessionData.role && sessionData.role !== 'seller') {
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Si no estamos en login, redirigir
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
              window.location.href = '/login';
            }
          }
        } catch (e) {
          // Si no se puede decodificar y es corto, también limpiar
          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      }
    }
  } catch (error) {
    // Ignorar errores
  }
}

