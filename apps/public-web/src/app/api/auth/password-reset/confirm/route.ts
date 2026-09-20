export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { confirmAppPasswordReset, isAuthAppKey } from '@autodealers/core/app-passwords';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const appKey = String(body.appKey || '').trim();
    const password = String(body.password || '');

    if (!token) {
      return NextResponse.json({ error: 'El enlace no es válido.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }
    if (!isAuthAppKey(appKey)) {
      return NextResponse.json(
        { error: 'El enlace no identifica una app válida. Solicita uno nuevo desde el login correcto.' },
        { status: 400 }
      );
    }

    await confirmAppPasswordReset({ appKey, token, password });
    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada para esta app.',
    });
  } catch (error) {
    console.error('app password reset confirm:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.' },
      { status: 400 }
    );
  }
}
