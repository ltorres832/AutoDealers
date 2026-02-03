/**
 * Script de inicialización del interceptor de fetch
 * Se ejecuta en el cliente para interceptar todas las llamadas fetch
 */

if (typeof window !== 'undefined') {
  // Importar el interceptor (se ejecutará automáticamente)
  import('../lib/fetch-interceptor').catch(err => {
    console.error('Error inicializando fetch interceptor:', err);
  });
}

