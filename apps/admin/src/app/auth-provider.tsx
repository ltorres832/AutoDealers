'use client';

import { useEffect } from 'react';

/**
 * Proveedor global que intercepta TODAS las peticiones fetch 
 * y automáticamente agrega el token de autenticación
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Guardar el fetch original
    const originalFetch = window.fetch;

    // Sobrescribir fetch global
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      // Obtener la URL
      const url = typeof input === 'string' ? input : (input as Request).url;

      // Solo interceptar peticiones a /api
      if (url.includes('/api')) {
        // Obtener token de autenticación
        const token = localStorage.getItem('authToken') || 
                      document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];

        if (token) {
          // Crear nuevas opciones con el token
          const newInit: RequestInit = {
            ...(init || {}),
            headers: {
              ...(init?.headers || {}),
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          };

          console.log(`🔐 Fetch interceptado: ${url}`);
          console.log(`   Token: ${token.substring(0, 20)}...`);
          return originalFetch(input, newInit);
        } else {
          console.error(`❌ NO HAY TOKEN para: ${url}`);
          console.error(`   localStorage: ${localStorage.getItem('authToken') ? 'SÍ' : 'NO'}`);
          console.error(`   cookie: ${document.cookie.includes('authToken') ? 'SÍ' : 'NO'}`);
        }
      }

      // Llamar al fetch original para otras peticiones
      return originalFetch(input, init);
    };

    console.log('✅ AuthProvider ACTIVADO');
    console.log(`   Token en localStorage: ${localStorage.getItem('authToken') ? 'SÍ (' + localStorage.getItem('authToken')?.substring(0, 20) + '...)' : 'NO'}`);

    // Cleanup: restaurar fetch original al desmontar
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}

