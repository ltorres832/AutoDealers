export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmailViaProvider } from '@autodealers/core/password-reset-email';

function resolveBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

function resolveActionBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.trim().replace(/\/$/, '') ||
    'https://www.autodealers-online.com'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendPasswordResetEmailViaProvider({
      email: String(body.email || ''),
      appName: 'AutoDealersOnline Seller',
      appKey: 'seller',
      appBaseUrl: resolveBaseUrl(request),
      actionBaseUrl: resolveActionBaseUrl(),
      loginPath: '/login',
    });

    if (!result.sent) {
      console.warn('password reset email:', result.error);
      return NextResponse.json(
        { error: 'No se pudo enviar el correo de recuperación. Verifica la configuración de email.' },
        { status: 500 }
      );
    }
    if (result.skipped) {
      console.warn('password reset email skipped: user not found');
    }

    return NextResponse.json({
      ok: true,
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también la carpeta de spam.',
    });
  } catch (error) {
    console.error('password reset route:', error);
    return NextResponse.json({
      ok: true,
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también la carpeta de spam.',
    });
  }
}
