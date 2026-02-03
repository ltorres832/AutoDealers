import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - se carga dinámicamente para evitar errores de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getAuth, getFirestore } = require('@autodealers/core') as any;

/**
 * API para validar usuario después de autenticación en el cliente
 * La verificación de contraseña se hace en el cliente con Firebase Auth
 * Esta API solo valida que el usuario existe y está activo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token } = body; // userId y token vienen del token de Firebase Auth después de autenticación

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'ID de usuario y token requeridos' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Obtener información del usuario de Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const role = userData?.role;
    const status = userData?.status;

    // Verificar que el usuario esté activo
    if (status !== 'active') {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida o cancelada' },
        { status: 403 }
      );
    }

    // Crear respuesta con cookie del token
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData?.email,
        name: userData?.name,
        role: role,
        tenantId: userData?.tenantId,
      },
    });

    // Guardar token en cookie (válido por 7 días)
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error validating user:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error al validar usuario',
      },
      { status: 500 }
    );
  }
}
