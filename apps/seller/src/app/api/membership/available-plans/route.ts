export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getActiveMemberships, getMemberships } from '@autodealers/billing';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
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

    console.log('🔍 [SELLER] Obteniendo planes disponibles (available-plans)...');
    
    // Intentar primero con getActiveMemberships
    let plans;
    try {
      plans = await getActiveMemberships('seller');
      console.log(`✅ [SELLER] getActiveMemberships devolvió ${plans.length} planes`);
    } catch (error: any) {
      console.warn('⚠️ [SELLER] getActiveMemberships falló, usando fallback:', error.message);
      // Fallback: usar getMemberships y filtrar manualmente
      const allMemberships = await getMemberships('seller');
      console.log(`📦 [SELLER] getMemberships devolvió ${allMemberships.length} membresías totales`);
      plans = allMemberships.filter(m => m.isActive === true);
      console.log(`✅ [SELLER] Después del filtro: ${plans.length} planes activos`);
    }

    // Log para debugging
    if (plans.length === 0) {
      console.warn('⚠️ [SELLER] No se encontraron planes activos para sellers');
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
      console.log(`✅ [SELLER] Devolviendo ${plans.length} planes activos:`);
      plans.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} - $${p.price}/${p.billingCycle}`);
      });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (error: any) {
    console.error('❌ [SELLER] Error fetching available plans:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        plans: [],
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


