import {getSupportTabToken} from '@autodealers/shared/support-tab-session';
// Utilidad para renovar tokens de Firebase automáticamente

import { auth } from './firebase-client';

/**
 * Obtiene un token fresco de Firebase Auth y actualiza la cookie
 */
export async function refreshAuthToken(): Promise<string | null> {
  const support=getSupportTabToken();if(support)return support;
  try {
    if (!auth || !auth.currentUser) {
      console.log('⚠️ refreshAuthToken: No hay usuario autenticado');
      return null;
    }

    // Obtener un token fresco (Firebase lo renueva automáticamente si es necesario)
    const token = await auth.currentUser.getIdToken(true); // true = forzar renovación
    
    // Verificar que el token sea válido
    if (!token || token.length < 200) {
      console.error('❌ Token inválido o truncado, longitud:', token.length);
      return null;
    }
    
    // Actualizar la cookie con el nuevo token (codificar para manejar caracteres especiales)
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = encodeURIComponent(token);
    document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    console.log('✅ Token renovado exitosamente, longitud:', token.length);
    return token;
  } catch (error: any) {
    console.error('❌ Error al renovar token:', error);
    return null;
  }
}

/**
 * Verifica si el token está expirado y lo renueva si es necesario
 */
export async function ensureFreshToken(): Promise<string | null> {
  const support=getSupportTabToken();if(support)return support;
  try {
    if (!auth || !auth.currentUser) {
      return null;
    }

    // Obtener token (Firebase maneja la renovación automáticamente)
    // Usar true para forzar renovación si está cerca de expirar
    const token = await auth.currentUser.getIdToken(true);
    
    // Verificar que el token sea válido
    if (!token || token.length < 200) {
      console.warn('⚠️ Token inválido o truncado, longitud:', token.length);
      // Intentar forzar renovación
      const refreshedToken = await auth.currentUser.getIdToken(true);
      if (refreshedToken && refreshedToken.length >= 200) {
        const isSecure = window.location.protocol === 'https:';
        const cookieValue = encodeURIComponent(refreshedToken);
        document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        console.log('✅ Token refrescado después de detectar token inválido');
        return refreshedToken;
      }
      return null;
    }
    
    // Actualizar la cookie (codificar para manejar caracteres especiales)
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = encodeURIComponent(token);
    document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    return token;
  } catch (error: any) {
    console.error('❌ Error al obtener token fresco:', error);
    
    // Si el error es porque el token expiró, intentar refrescar
    if (error.code === 'auth/id-token-expired' || error.message?.includes('expired')) {
      console.log('🔄 Token expirado detectado, intentando refrescar...');
      try {
        const refreshedToken = await refreshAuthToken();
        if (refreshedToken) {
          return refreshedToken;
        }
      } catch (refreshError) {
        console.error('❌ Error al refrescar token expirado:', refreshError);
      }
    }
    
    return null;
  }
}

