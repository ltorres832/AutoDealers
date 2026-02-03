import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getActiveMemberships, getMemberships } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      // Si no hay auth, puede ser porque el token es de otra app
      const response = NextResponse.json({ 
        error: 'Unauthorized',
        clearCookie: true, // Indicar al cliente que limpie la cookie
        message: 'Por favor, inicia sesión como vendedor'
      }, { status: 401 });
      
      // Limpiar cookie en la respuesta
      response.cookies.delete('authToken');
      return response;
    }

    console.log('🔍 [SELLER] Obteniendo membresías activas para sellers...');
    
    // Intentar primero con getActiveMemberships
    let memberships;
    try {
      memberships = await getActiveMemberships('seller');
      console.log(`✅ [SELLER] getActiveMemberships devolvió ${memberships.length} membresías`);
    } catch (error: any) {
      console.warn('⚠️ [SELLER] getActiveMemberships falló, usando fallback:', error.message);
      // Fallback: usar getMemberships y filtrar manualmente
      const allMemberships = await getMemberships('seller');
      console.log(`📦 [SELLER] getMemberships devolvió ${allMemberships.length} membresías totales`);
      memberships = allMemberships.filter(m => m.isActive === true);
      console.log(`✅ [SELLER] Después del filtro: ${memberships.length} membresías activas`);
    }

    // Log para debugging
    if (memberships.length === 0) {
      console.warn('⚠️ [SELLER] No se encontraron membresías activas para sellers');
      // Intentar obtener todas las membresías para debug
      try {
        const allMemberships = await getMemberships('seller');
        console.log(`🔍 [SELLER] Debug: Total de membresías (seller): ${allMemberships.length}`);
        allMemberships.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.name} - Activa: ${m.isActive} - Tipo: ${m.type}`);
        });
      } catch (debugError) {
        console.error('Error en debug:', debugError);
      }
    } else {
      console.log(`✅ [SELLER] Devolviendo ${memberships.length} membresías activas:`);
      memberships.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} - $${m.price}/${m.billingCycle}`);
      });
    }

    return NextResponse.json({ memberships: memberships || [] });
  } catch (error: any) {
    console.error('❌ [SELLER] Error fetching available memberships:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message, 
        memberships: [],
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}



