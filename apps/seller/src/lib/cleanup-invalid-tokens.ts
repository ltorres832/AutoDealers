/**
 * Limpia automáticamente tokens inválidos de otras apps
 * Limpia cookies y redirige al login si detecta token de otra app
 */
export function cleanupInvalidTokens(): void {
  if (typeof window === 'undefined') return;
  
  // NO hacer nada si estamos en login o register
  const currentPath = window.location.pathname;
  if (currentPath === '/login' || currentPath === '/register') {
    return;
  }
  
  try {
    const cookies = document.cookie.split(';');
    const authTokenCookie = cookies.find(c => c.trim().startsWith('authToken='));
    
    if (authTokenCookie) {
      const tokenValue = decodeURIComponent(authTokenCookie.split('=')[1] || '');
      
      // Solo limpiar si es un token personalizado de otra app (muy corto)
      if (tokenValue && tokenValue.length < 200) {
        try {
          const decoded = atob(tokenValue);
          const sessionData = JSON.parse(decoded);
          
          // Solo limpiar si es de otra app (no seller)
          if (sessionData.role && sessionData.role !== 'seller') {
            console.warn('⚠️ [CLEANUP] Token de otra app detectado:', sessionData.role);
            console.warn('⚠️ [CLEANUP] Limpiando cookies y redirigiendo al login...');
            
            // Limpiar todas las cookies de authToken
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'authToken=; path=/dealer; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Redirigir al login después de un pequeño delay para asegurar que las cookies se limpien
            setTimeout(() => {
              if (window.location.pathname !== '/login') {
                console.log('🔄 [CLEANUP] Redirigiendo al login...');
                window.location.href = '/login';
              }
            }, 100);
            
            return;
          }
        } catch (e) {
          // Si no se puede decodificar, puede ser un token válido de Firebase
          // No hacer nada en este caso
        }
      }
    }
  } catch (error) {
    // Ignorar errores silenciosamente
    console.error('Error en cleanupInvalidTokens:', error);
  }
}

