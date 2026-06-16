import type { NextRequest } from 'next/server';

const DEFAULT_PUBLIC_WEB = 'https://autodealers-7f62e.web.app';

export function getPublicWebBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const origin = request.nextUrl.origin.replace(/^https?:\/\/seller\./, 'https://');
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin)) {
    return DEFAULT_PUBLIC_WEB;
  }
  return origin;
}

export function buildReviewInvitePublicUrl(request: NextRequest, token: string): string {
  return `${getPublicWebBaseUrl(request)}/evaluar/${encodeURIComponent(token)}`;
}
