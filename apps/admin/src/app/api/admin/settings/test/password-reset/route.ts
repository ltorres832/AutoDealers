export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmailViaProvider } from '@autodealers/core/password-reset-email';
import { verifyAuth } from '@/lib/auth';

function resolveAdminBaseUrl(request: NextRequest): string {
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
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Email inválido' }, { status: 400 });
    }

    const result = await sendPasswordResetEmailViaProvider({
      email,
      appName: 'AutoDealersOnline Admin',
      appKey: 'admin',
      appBaseUrl: resolveAdminBaseUrl(request),
      actionBaseUrl: resolveActionBaseUrl(),
      loginPath: '/login',
    });

    if (result.skipped) {
      return NextResponse.json({
        success: false,
        skipped: true,
        error: 'Firebase Auth no encontró un usuario con ese email. No se envió reset.',
      });
    }

    if (!result.sent) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo enviar reset' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Reset enviado correctamente' });
  } catch (error) {
    console.error('test password reset:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
