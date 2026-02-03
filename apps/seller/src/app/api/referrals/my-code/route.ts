import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getReferralCode } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/referrals/my-code - Iniciando...');
    const auth = await verifyAuth(request);
    
    if (!auth) {
      console.error('❌ No se pudo autenticar - verifyAuth retornó null');
      
      // Limpiar cookie inválida en la respuesta
      const response = NextResponse.json(
        { 
          error: 'No autorizado',
          message: 'Tu sesión ha expirado o no estás autenticado. Por favor, inicia sesión nuevamente.',
          clearCookie: true
        },
        { status: 401 }
      );
      
      // Limpiar la cookie en la respuesta
      response.cookies.delete('authToken');
      response.cookies.set('authToken', '', { 
        path: '/', 
        expires: new Date(0),
        maxAge: 0
      });
      
      return response;
    }

    console.log('✅ Usuario autenticado:', { userId: auth.userId, role: auth.role });

    if (auth.role !== 'seller') {
      console.error('❌ Rol incorrecto:', auth.role);
      return NextResponse.json(
        { error: 'No autorizado. Solo vendedores pueden acceder.' },
        { status: 403 }
      );
    }

    console.log('🔄 Obteniendo código de referido para userId:', auth.userId);
    
    try {
      const code = await getReferralCode(auth.userId);
      
      if (!code) {
        console.error('❌ No se pudo generar el código de referido - getReferralCode retornó null');
        
        // Verificar si el usuario existe y tiene el rol correcto
        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(auth.userId).get();
        
        if (!userDoc.exists) {
          return NextResponse.json(
            { error: 'Usuario no encontrado en la base de datos' },
            { status: 404 }
          );
        }
        
        const userData = userDoc.data();
        if (userData?.role !== 'seller' && userData?.role !== 'dealer') {
          return NextResponse.json(
            { error: 'Solo vendedores y dealers pueden tener códigos de referido' },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { error: 'No se pudo generar el código de referido. Por favor, contacta al soporte.' },
          { status: 500 }
        );
      }
      
      console.log('✅ Código obtenido exitosamente:', code);

    console.log('✅ Código generado:', code);
    // Obtener la URL base (sin subdominio seller)
    let baseUrl = request.nextUrl.origin;
    // Si tiene subdominio seller, removerlo
    if (baseUrl.includes('seller.')) {
      baseUrl = baseUrl.replace('seller.', '');
    }
    // Link de referido apunta a la página de registro con tipo seller
    const referralLink = `${baseUrl}/register?ref=${code}&type=seller`;

      console.log('✅ Link generado:', referralLink);

      return NextResponse.json({
        code,
        link: referralLink,
      });
    } catch (codeError: any) {
      console.error('❌ Error al obtener código:', codeError.message);
      console.error('❌ Error stack:', codeError.stack);
      return NextResponse.json(
        { error: 'Error al generar código de referido', details: codeError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error getting referral code:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

