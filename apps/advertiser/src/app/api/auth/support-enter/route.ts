import { NextRequest, NextResponse } from 'next/server';
import { validateSupportSessionToken } from '@autodealers/core';
import { getAdvertiserAppOrigin } from '@/lib/app-origin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/support-enter?token=...
 * Intercambia el token de soporte por la cookie authToken del panel advertiser.
 */
export async function GET(request: NextRequest) {
  const origin = getAdvertiserAppOrigin(request);
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) {
      return NextResponse.redirect(new URL('/login?error=support_token', origin));
    }

    const validated = await validateSupportSessionToken(token);
    if (!validated || validated.session.portal !== 'advertiser') {
      return NextResponse.redirect(new URL('/login?error=support_invalid', origin));
    }

    const res = NextResponse.redirect(new URL('/dashboard', origin));
    const isSecure = origin.startsWith('https:');
    const maxAge = Math.max(
      60,
      Math.floor((validated.session.expiresAt.getTime() - Date.now()) / 1000)
    );
    res.cookies.set('authToken', token, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: isSecure,
      httpOnly: false,
    });
    return res;
  } catch (error) {
    console.error('[advertiser support-enter]', error);
    return NextResponse.redirect(new URL('/login?error=support_error', origin));
  }
}
