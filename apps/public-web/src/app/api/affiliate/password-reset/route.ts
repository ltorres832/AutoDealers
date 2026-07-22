export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmailViaProvider } from '@autodealers/core/password-reset-email';

function resolveBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendPasswordResetEmailViaProvider({
      email: String(body.email || ''),
      appName: 'AutoDealers Afiliados',
      appKey: 'affiliate',
      appBaseUrl: resolveBaseUrl(request),
      actionBaseUrl: resolveBaseUrl(request),
      loginPath: '/affiliate/login',
    });

    if (!result.sent) {
      return NextResponse.json(
        { error: 'No se pudo enviar el correo de recuperación.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        'Si existe una cuenta de afiliado con ese correo, recibirás un enlace para restablecer la contraseña.',
    });
  } catch (error) {
    console.error('affiliate password reset:', error);
    return NextResponse.json({
      ok: true,
      message:
        'Si existe una cuenta de afiliado con ese correo, recibirás un enlace para restablecer la contraseña.',
    });
  }
}
