import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Eliminar cookie de autenticación
    cookieStore.delete('authToken');
    
    return NextResponse.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error: any) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión', details: error.message },
      { status: 500 }
    );
  }
}


