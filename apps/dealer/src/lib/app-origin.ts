import type { NextRequest } from 'next/server';

const DEV_ORIGIN = 'http://localhost:3002';
const PROD_ORIGIN =
  'https://dealer-app--autodealers-7f62e.us-central1.hosted.app';

export function getAppOrigin(request?: NextRequest): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_DEALER_URL?.trim();
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
      const port = url.port || '3002';
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

export function getIntegrationsOAuthCallbackUrl(request?: NextRequest): string {
  return `${getAppOrigin(request)}/api/settings/integrations/callback`;
}

export function buildAppRedirectUrl(
  pathWithQuery: string,
  request?: NextRequest
): string {
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${getAppOrigin(request).replace(/\/$/, '')}${path}`;
}
