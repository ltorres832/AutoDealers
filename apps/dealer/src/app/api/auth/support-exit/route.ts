import { NextRequest, NextResponse } from 'next/server';
import { endSupportSession, tryParseSupportSessionToken } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Cierra la sesión de soporte y limpia la cookie. */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const cookieToken = request.cookies.get('authToken')?.value || '';
    let raw = cookieToken;
    try {
      raw = decodeURIComponent(cookieToken);
    } catch {
      /* keep */
    }
    const payload = tryParseSupportSessionToken(raw);
    if (auth?.supportSessionId) {
      await endSupportSession(auth.supportSessionId, 'ended');
    } else if (payload?.sid && auth?.supportMode) {
      await endSupportSession(payload.sid, 'ended');
    }

    const res = NextResponse.json({ success: true });
    // Cookies are shared by tabs. The ended token is rejected server-side;
    // leave the navigation cookie in place so another support tab can reload.
    return res;
  } catch (error) {
    console.error('[dealer support-exit]', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
