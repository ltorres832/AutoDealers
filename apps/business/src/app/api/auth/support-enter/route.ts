import { NextRequest, NextResponse } from 'next/server';
import { validateSupportSessionToken } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/support-enter?token=...
 * Intercambia el token de soporte por la cookie authToken del panel business.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token) {
      return NextResponse.redirect(new URL('/login?error=support_token', request.url));
    }

    const validated = await validateSupportSessionToken(token);
    if (!validated || validated.session.portal !== 'business') {
      return NextResponse.redirect(new URL('/login?error=support_invalid', request.url));
    }

    const res = NextResponse.redirect(new URL('/dashboard', request.url));
    const isSecure = request.nextUrl.protocol === 'https:';
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
    console.error('[business support-enter]', error);
    return NextResponse.redirect(new URL('/login?error=support_error', request.url));
  }
}
