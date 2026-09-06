export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmailViaProvider } from '@autodealers/core/password-reset-email';

function resolveBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendPasswordResetEmailViaProvider({
      email: String(body.email || ''),
      appName: 'AutoDealersOnline Negocio',
      appKey: 'business',
      appBaseUrl: resolveBaseUrl(request),
      actionBaseUrl:
        process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.trim().replace(/\/$/, '') ||
        'https://www.autodealers-online.com',
      loginPath: '/login',
    });
    if (!result.sent) {
      return NextResponse.json({ error: 'No se pudo enviar el correo de recuperación.' }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.',
    });
  } catch {
    return NextResponse.json({
      ok: true,
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.',
    });
  }
}
