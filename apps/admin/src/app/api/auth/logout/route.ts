import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Cierra sesión eliminando el sessionId de Firestore
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;

    if (token) {
      // Eliminar sesión de Firestore
      const db = getFirestore();
      await db.collection('sessions').doc(token).delete();
      console.log('✅ Sesión eliminada de Firestore');
    }

    return NextResponse.json({ success: true, message: 'Sesión cerrada' });
  } catch (error: any) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}
