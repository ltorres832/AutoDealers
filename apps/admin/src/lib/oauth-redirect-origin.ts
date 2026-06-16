import type { NextRequest } from 'next/server';

const DEV_ORIGIN = 'http://localhost:3001';
const PROD_ORIGIN = 'https://admin-app--autodealers-7f62e.us-central1.hosted.app';

/**
 * Origen público del admin para OAuth Meta y redirects post-callback.
 * En App Hosting el request interno puede ser 0.0.0.0:8080 (no usable en el navegador).
 */
export function getOAuthRedirectOrigin(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost) {
      const host = forwardedHost.split(',')[0].trim();
      const proto = forwardedProto || 'https';
      return `${proto}://${host}`;
    }

    const url = request.nextUrl;
    if (url.hostname === '0.0.0.0' || url.hostname === '127.0.0.1') {
      if (process.env.NODE_ENV === 'production') {
        return PROD_ORIGIN;
      }
      const port = url.port || '3001';
      return `http://localhost:${port}`;
    }
    if (url.hostname && url.hostname !== 'localhost') {
      return url.origin;
    }
    if (url.port) {
      return `http://localhost:${url.port}`;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return PROD_ORIGIN;
  }

  return DEV_ORIGIN;
}

/** Redirección post-OAuth: nunca usar request.url (puede ser 0.0.0.0:8080 en App Hosting). */
export function buildOAuthRedirectUrl(pathWithQuery: string, request?: NextRequest): string {
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${getOAuthRedirectOrigin(request).replace(/\/$/, '')}${path}`;
}
