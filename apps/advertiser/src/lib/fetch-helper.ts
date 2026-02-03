/**
 * Helper para hacer fetch con manejo seguro de errores JSON
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string; response: Response }> {
  try {
    const response = await fetch(url, options);
    
    // Verificar que la respuesta sea JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Expected JSON but got ${contentType} from ${url}:`, text.substring(0, 200));
      
      // Si es una redirección HTML, probablemente es un error de autenticación
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        return {
          error: 'Error de autenticación. Por favor inicia sesión nuevamente.',
          response,
        };
      }
      
      return {
        error: `Respuesta inválida del servidor (${contentType})`,
        response,
      };
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        error: data.error || `Error ${response.status}: ${response.statusText}`,
        response,
      };
    }
    
    return { data, response };
  } catch (error: any) {
    console.error(`Error fetching ${url}:`, error);
    
    // Si es un error de parseo JSON, probablemente recibimos HTML
    if (error.message && error.message.includes('JSON')) {
      return {
        error: 'Error al procesar la respuesta del servidor. Por favor recarga la página.',
        response: new Response(),
      };
    }
    
    return {
      error: error.message || 'Error de conexión',
      response: new Response(),
    };
  }
}

