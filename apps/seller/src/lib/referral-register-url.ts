import type { NextRequest } from 'next/server';

const DEFAULT_PUBLIC_WEB = 'https://autodealers-7f62e.web.app';

/** URL del registro público (public-web), no del panel seller. */
export function getPublicRegisterBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const origin = request.nextUrl.origin.replace(/^https?:\/\/seller\./, 'https://');
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin)) {
    return DEFAULT_PUBLIC_WEB;
  }
  return origin;
}

export function buildSellerReferralRegisterLink(request: NextRequest, code: string): string {
  const base = getPublicRegisterBaseUrl(request);
  return `${base}/register?ref=${encodeURIComponent(code)}&type=seller`;
}
