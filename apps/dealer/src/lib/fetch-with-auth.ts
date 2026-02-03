// Wrapper de fetch que automáticamente renueva el token antes de cada request

import { auth } from './firebase-client';

// Cache del último token renovado y su timestamp
let lastToken: string | null = null;
let lastTokenTime: number = 0;
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutos (renovar antes de que expire)

/**
 * Obtiene un token fresco de Firebase Auth y actualiza la cookie
 * SIEMPRE renueva el token para asegurar que nunca esté expirado
 */
async function getFreshToken(): Promise<string | null> {
  try {
    if (!auth) {
      console.error('❌ getFreshToken: auth no está disponible');
      return null;
    }

    // Esperar a que Firebase Auth esté listo
    let user = auth.currentUser;
    
    // Si no hay usuario, esperar hasta 5 segundos
    if (!user) {
      await new Promise<void>((resolve) => {
        const { onAuthStateChanged } = require('firebase/auth');
        let resolved = false;
        const unsubscribe = onAuthStateChanged(auth, (u: any) => {
          if (u && !resolved) {
            user = u;
            resolved = true;
            unsubscribe();
            resolve();
          }
        });
        
        // Timeout después de 5 segundos
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            unsubscribe();
            resolve();
          }
        }, 5000);
      });
    }

    if (!user) {
      console.error('❌ getFreshToken: No hay usuario autenticado después de esperar');
      return null;
    }

    // SIEMPRE forzar renovación del token (true = forzar renovación)
    // Esto asegura que el token nunca esté expirado
    const token = await user.getIdToken(true);
    
    if (!token || token.length < 200) {
      console.error('❌ getFreshToken: Token inválido recibido');
      return null;
    }
    
    // Actualizar cache
    lastToken = token;
    lastTokenTime = Date.now();
    
    // Actualizar la cookie inmediatamente
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = encodeURIComponent(token);
    
    // Limpiar todas las cookies viejas primero
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Guardar nuevo token con max-age de 1 día
    document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    // Esperar para asegurar que la cookie se guarde
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return token;
  } catch (error: any) {
    console.error('❌ Error al obtener token fresco:', error);
    return null;
  }
}

// Renovar token automáticamente cada 50 minutos
if (typeof window !== 'undefined') {
  setInterval(async () => {
    try {
      await getFreshToken();
      console.log('✅ Token renovado automáticamente (cada 50 min)');
    } catch (error) {
      console.error('❌ Error en renovación automática:', error);
    }
  }, TOKEN_REFRESH_INTERVAL);
}

/**
 * Wrapper de fetch que automáticamente renueva el token antes de cada request
 * SIEMPRE renueva el token para asegurar que nunca esté expirado
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // SIEMPRE renovar token ANTES de hacer la request
  // Esto asegura que el token nunca esté expirado
  const token = await getFreshToken();
  
  if (!token) {
    console.error('❌ fetchWithAuth: No se pudo obtener token fresco');
    throw new Error('No se pudo obtener token de autenticación. Por favor, inicia sesión nuevamente.');
  }
  
  console.log('✅ fetchWithAuth: Token renovado antes de request, longitud:', token.length);

  // Esperar un momento adicional para asegurar que la cookie se guarde
  await new Promise(resolve => setTimeout(resolve, 300));

  // Preparar headers - agregar Authorization header además de la cookie
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  // Hacer la request con credentials para incluir cookies Y Authorization header
  let response = await fetch(url, {
    ...options,
    headers: headers,
    credentials: 'include',
  });

  // Si recibimos 401, renovar token FORZADAMENTE y reintentar
  // EXCEPCIÓN: Para el chat interno, solo reintentar pero NO lanzar errores
  const isInternalChat = url.includes('/api/internal-chat/');
  
  if (response.status === 401) {
    // Para el chat interno, solo intentar refrescar pero NO lanzar errores
    if (isInternalChat) {
      const newToken = await getFreshToken();
      if (newToken) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        });
      }
      // No lanzar errores para chat interno, solo retornar la respuesta
      return response;
    }
    
    console.log('⚠️ fetchWithAuth: 401 recibido, renovando token FORZADAMENTE y reintentando...');
    
    // Forzar renovación del token
    const newToken = await getFreshToken();
    
    if (newToken) {
      // Esperar más tiempo para asegurar que la cookie se actualice
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Preparar headers con el nuevo token
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      
      // Reintentar la request con el nuevo token en header también
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
      
      // Si sigue siendo 401 después de renovar, hay un problema más serio
      if (response.status === 401) {
        console.error('❌ fetchWithAuth: Sigue siendo 401 después de renovar token');
        throw new Error('Error de autenticación. Por favor, inicia sesión nuevamente.');
      }
    } else {
      throw new Error('No se pudo renovar el token. Por favor, inicia sesión nuevamente.');
    }
  }

  return response;
}

