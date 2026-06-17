/**
 * Utilidades para detectar subdominios en cliente y servidor
 */
import { isPlatformAppSubdomain } from './public-production-hosts';

export function getSubdomainFromHostname(hostname: string): string | null {
  if (!hostname) return null;

  const parts = hostname.split('.');

  if (hostname.includes('localhost')) {
    const localhostParts = hostname.split(':');
    if (localhostParts[0] !== 'localhost' && localhostParts[0] !== 'www') {
      return localhostParts[0];
    }
    return null;
  }

  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (!isPlatformAppSubdomain(subdomain)) {
      return subdomain;
    }
  }

  return null;
}

export function getSubdomainFromClient(): string | null {
  if (typeof window === 'undefined') return null;
  return getSubdomainFromHostname(window.location.hostname);
}

export function getSubdomainFromParams(params: { subdomain?: string }): string | null {
  return params?.subdomain || null;
}
