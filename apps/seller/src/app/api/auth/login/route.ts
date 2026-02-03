import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

/**
 * API para validar usuario después de autenticación en el cliente
 * La verificación de contraseña se hace en el cliente con Firebase Auth
 * Esta API solo valida que el usuario existe y está activo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body; // userId viene del token de Firebase Auth después de autenticación

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
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

    // Verificar que sea seller
    if (role !== 'seller') {
      return NextResponse.json(
        { error: 'Solo vendedores pueden acceder aquí' },
        { status: 403 }
      );
    }

    // Verificar que el usuario esté activo (si status existe, debe ser 'active')
    // Si status no existe, asumimos que está activo (compatibilidad con usuarios antiguos)
    if (status !== undefined && status !== 'active') {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida o cancelada' },
        { status: 403 }
      );
    }

    // Retornar información del usuario
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData?.email,
        name: userData?.name,
        role: role,
        tenantId: userData?.tenantId,
        dealerId: userData?.dealerId,
      },
    });
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

