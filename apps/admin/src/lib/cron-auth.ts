import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

/**
 * Autoriza llamadas de cron: Bearer CRON_SECRET o sesión admin.
 * Retorna null si está autorizado; si no, la respuesta 401.
 */
export async function authorizeCronRequest(
  request: NextRequest
): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim() ?? '';
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim();

  if (cronSecret) {
    if (bearer === cronSecret || querySecret === cronSecret) {
      return null;
    }
    const auth = await verifyAuth(request);
    if (auth?.role === 'admin') {
      return null;
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Configura CRON_SECRET o inicia sesión como administrador.',
      },
      { status: 401 }
    );
  }
  return null;
}
