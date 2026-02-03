import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y password requeridos' }, { status: 400 });
    }

    // Verificar credenciales manualmente
    if (email !== 'admin@autodealers.com' || password !== 'Admin123456') {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Obtener el usuario de Firebase
    const auth = getAuth();
    const user = await auth.getUserByEmail(email);

    // Generar custom token
    const customToken = await auth.createCustomToken(user.uid);

    return NextResponse.json({ 
      success: true,
      customToken,
      user: {
        uid: user.uid,
        email: user.email,
      }
    });

  } catch (error: any) {
    console.error('Error en custom login:', error);
    return NextResponse.json(
      { error: error.message || 'Error al autenticar' },
      { status: 500 }
    );
  }
}


