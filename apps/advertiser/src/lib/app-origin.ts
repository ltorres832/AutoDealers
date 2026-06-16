import type { NextRequest } from 'next/server';

const PROD_ADVERTISER_ORIGIN =
  'https://advertiser-app--autodealers-7f62e.us-central1.hosted.app';

/** Origen público del panel anunciante (Stripe return URLs, enlaces). */
export function getAdvertiserAppOrigin(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADVERTISER_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    if (host && !host.includes('localhost')) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return PROD_ADVERTISER_ORIGIN;
  }

  return 'http://localhost:3004';
}

export function advertiserBillingReturnUrl(
  request: NextRequest,
  query: 'success=true' | 'canceled=true'
): string {
  return `${getAdvertiserAppOrigin(request)}/dashboard/billing?${query}`;
}
