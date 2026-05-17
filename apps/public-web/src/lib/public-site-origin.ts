import type { NextRequest } from 'next/server';

/**
 * Origen público para redirects (Stripe, etc.). Evita `http://0.0.0.0:puerto`,
 * que el navegador no puede abrir cuando el servidor hace bind en 0.0.0.0.
 */
export function getPublicSiteOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    const proto = forwardedProto || 'https';
    return `${proto}://${host}`;
  }

  const url = request.nextUrl;
  if (url.hostname === '0.0.0.0') {
    const port = url.port;
    return port ? `http://localhost:${port}` : 'http://localhost';
  }

  return url.origin;
}
