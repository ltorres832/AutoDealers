import type { NextRequest } from 'next/server';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';

export function getPublicRegisterBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const origin = request.nextUrl.origin;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin)) {
    return resolvePublicWebUrl();
  }
  return origin.replace(/^https?:\/\/app\./, 'https://');
}

export function buildDealerReferralRegisterLink(request: NextRequest, code: string): string {
  const base = getPublicRegisterBaseUrl(request);
  return `${base}/register?ref=${encodeURIComponent(code)}&type=dealer`;
}
