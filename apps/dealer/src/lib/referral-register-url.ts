import type { NextRequest } from 'next/server';

const DEFAULT_PUBLIC_WEB = 'https://autodealers-7f62e.web.app';

export function getPublicRegisterBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const origin = request.nextUrl.origin;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin)) {
    return DEFAULT_PUBLIC_WEB;
  }
  return origin.replace(/^https?:\/\/app\./, 'https://');
}

export function buildDealerReferralRegisterLink(request: NextRequest, code: string): string {
  const base = getPublicRegisterBaseUrl(request);
  return `${base}/register?ref=${encodeURIComponent(code)}&type=dealer`;
}
