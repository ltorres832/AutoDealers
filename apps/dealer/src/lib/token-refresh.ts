// Utilidad para renovar tokens de Firebase automáticamente

import { auth } from './firebase-client';

/**
 * Obtiene un token fresco de Firebase Auth y actualiza la cookie
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    if (!auth || !auth.currentUser) {
      console.log('⚠️ refreshAuthToken: No hay usuario autenticado');
      return null;
    }

    // Obtener un token fresco (Firebase lo renueva automáticamente si es necesario)
    const token = await auth.currentUser.getIdToken(true); // true = forzar renovación
    
    // Actualizar la cookie con encodeURIComponent para consistencia con login
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = encodeURIComponent(token);
    document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    console.log('✅ Token renovado exitosamente');
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
  try {
    if (!auth) {
      console.warn('⚠️ ensureFreshToken: auth no está disponible');
      return null;
    }
    
    // Esperar a que Firebase Auth esté listo
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!auth.currentUser) {
      console.warn('⚠️ ensureFreshToken: No hay usuario autenticado');
      // Intentar obtener el usuario desde onAuthStateChanged
      return new Promise((resolve) => {
        const { onAuthStateChanged } = require('firebase/auth');
        const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
          unsubscribe();
          if (user) {
            try {
              const token = await user.getIdToken(true);
              const isSecure = window.location.protocol === 'https:';
              const cookieValue = encodeURIComponent(token);
              document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
              console.log('✅ ensureFreshToken: Token obtenido desde onAuthStateChanged');
              resolve(token);
            } catch (error) {
              console.error('❌ Error obteniendo token desde onAuthStateChanged:', error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
        
        // Timeout después de 2 segundos
        setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 2000);
      });
    }

    // SIEMPRE obtener un token fresco (Firebase lo renueva automáticamente si es necesario)
    // Usar true para forzar renovación si está cerca de expirar o ya expiró
    console.log('🔄 ensureFreshToken: Obteniendo token fresco...');
    const token = await auth.currentUser.getIdToken(true); // true = forzar renovación
    
    if (!token || token.length < 200) {
      console.error('❌ ensureFreshToken: Token inválido recibido');
      return null;
    }
    
    console.log('✅ ensureFreshToken: Token obtenido, longitud:', token.length);
    
    // Actualizar la cookie con encodeURIComponent para consistencia con login
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = encodeURIComponent(token);
    
    // Limpiar cookies viejas primero
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Guardar nuevo token
    document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    // Esperar un momento para asegurar que la cookie se guarde
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('✅ ensureFreshToken: Token renovado y guardado en cookie');
    return token;
  } catch (error: any) {
    console.error('❌ Error al obtener token fresco:', error);
    return null;
  }
}

