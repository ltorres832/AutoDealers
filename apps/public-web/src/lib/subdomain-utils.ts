/**
 * Utilidades para detectar subdominios en cliente y servidor
 */

export function getSubdomainFromHostname(hostname: string): string | null {
  if (!hostname) return null;
  
  const parts = hostname.split('.');
  
  // En localhost: subdomain.localhost:3000
  if (hostname.includes('localhost')) {
    const localhostParts = hostname.split(':');
    if (localhostParts[0] !== 'localhost' && localhostParts[0] !== 'www') {
      return localhostParts[0];
    }
    return null;
  }
  
  // En producción: subdomain.autodealers.com
  // Excluir subdominios fijos (admin, dealers, sellers, ads, www)
  const fixedSubdomains = ['admin', 'dealers', 'sellers', 'ads', 'www'];
  
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (!fixedSubdomains.includes(subdomain.toLowerCase())) {
      return subdomain;
    }
  }
  
  // Si es el dominio raíz sin subdominio, retornar null
  return null;
}

/**
 * Obtiene el subdominio desde el cliente (browser)
 */
export function getSubdomainFromClient(): string | null {
  if (typeof window === 'undefined') return null;
  return getSubdomainFromHostname(window.location.hostname);
}

/**
 * Obtiene el subdominio desde los parámetros de la URL (Next.js)
 */
export function getSubdomainFromParams(params: { subdomain?: string }): string | null {
  return params?.subdomain || null;
}



