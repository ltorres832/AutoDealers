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
    if (payload?.sid) {
      await endSupportSession(payload.sid, 'ended');
    } else if ((auth as { supportSessionId?: string } | null)?.supportSessionId) {
      await endSupportSession(
        String((auth as { supportSessionId?: string }).supportSessionId),
        'ended'
      );
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('authToken', '', { path: '/', maxAge: 0 });
    return res;
  } catch (error) {
    console.error('[business support-exit]', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
