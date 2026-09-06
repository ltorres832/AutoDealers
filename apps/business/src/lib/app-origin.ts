import type { NextRequest } from 'next/server';
import { resolveBusinessUrl } from '@autodealers/shared/platform-urls';

const DEV_ORIGIN = 'http://localhost:3006';

export function getAppOrigin(request?: NextRequest): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BUSINESS_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BUSINESS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost) {
      const host = forwardedHost.split(',')[0].trim();
      const proto = forwardedProto || 'https';
      return `${proto}://${host}`;
    }
    const url = request.nextUrl;
    if (url.hostname && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.hostname !== '0.0.0.0') {
      return url.origin;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return resolveBusinessUrl();
  }
  return DEV_ORIGIN;
}
