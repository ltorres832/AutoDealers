import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getActiveMemberships, getMemberships } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener la membresía actual del usuario para determinar el tipo
    const { getSubscriptionByTenantId, getMembershipById } = await import('@autodealers/billing');
    let isMultiDealer = false;
    
    try {
      const subscription = await getSubscriptionByTenantId(auth.tenantId);
      
      if (subscription?.membershipId) {
        try {
          const currentMembership = await getMembershipById(subscription.membershipId);
          isMultiDealer = currentMembership?.features?.multiDealerEnabled === true;
        } catch (membershipError: any) {
          console.warn('⚠️ [DEALER] Error obteniendo membresía actual:', membershipError.message);
          // Si no puede obtener la membresía actual, asumir dealer regular
          isMultiDealer = false;
        }
      } else {
        // Si no hay suscripción, asumir dealer regular (mostrar todas las membresías dealer regulares)
        console.log('⚠️ [DEALER] Usuario sin suscripción, asumiendo dealer regular');
        isMultiDealer = false;
      }
    } catch (subscriptionError: any) {
      console.warn('⚠️ [DEALER] Error obteniendo suscripción:', subscriptionError.message);
      // Si hay error obteniendo suscripción, asumir dealer regular
      isMultiDealer = false;
    }

    console.log('🔍 [DEALER] Obteniendo membresías activas para dealers...');
    console.log(`🔍 [DEALER] Usuario es multi-dealer: ${isMultiDealer}`);
    
    // Obtener todas las membresías de dealer
    let allMemberships: any[] = [];
    try {
      allMemberships = await getActiveMemberships('dealer');
      console.log(`✅ [DEALER] getActiveMemberships devolvió ${allMemberships.length} membresías`);
    } catch (error: any) {
      console.warn('⚠️ [DEALER] getActiveMemberships falló, usando fallback:', error.message);
      try {
        // Fallback: usar getMemberships y filtrar manualmente
        const allMembershipsRaw = await getMemberships('dealer');
        console.log(`📦 [DEALER] getMemberships devolvió ${allMembershipsRaw.length} membresías totales`);
        allMemberships = allMembershipsRaw.filter(m => m.isActive === true);
        console.log(`✅ [DEALER] Después del filtro: ${allMemberships.length} membresías activas`);
      } catch (fallbackError: any) {
        console.error('❌ [DEALER] Error en fallback de getMemberships:', fallbackError.message);
        // Si falla todo, retornar array vacío pero no error
        allMemberships = [];
      }
    }
    
    // Si no hay membresías, retornar array vacío (no error)
    if (!allMemberships || allMemberships.length === 0) {
      console.warn('⚠️ [DEALER] No se encontraron membresías activas');
      return NextResponse.json({ memberships: [] });
    }

    // Filtrar según el tipo de cuenta:
    // - Si es multi-dealer: solo mostrar membresías multi-dealer (multiDealerEnabled === true)
    // - Si es dealer regular: solo mostrar membresías dealer regular (multiDealerEnabled !== true o undefined)
    let memberships;
    if (isMultiDealer) {
      // Usuario multi-dealer: solo mostrar membresías multi-dealer
      memberships = allMemberships.filter(m => m.features?.multiDealerEnabled === true);
      console.log(`✅ [DEALER] Filtrando para multi-dealer: ${memberships.length} membresías`);
    } else {
      // Usuario dealer regular: solo mostrar membresías dealer regular (NO multi-dealer)
      memberships = allMemberships.filter(m => !m.features?.multiDealerEnabled);
      console.log(`✅ [DEALER] Filtrando para dealer regular: ${memberships.length} membresías`);
    }

    // Log para debugging
    if (memberships.length === 0) {
      console.warn('⚠️ [DEALER] No se encontraron membresías activas para dealers');
      // Intentar obtener todas las membresías para debug
      try {
        const allMemberships = await getMemberships('dealer');
        console.log(`🔍 [DEALER] Debug: Total de membresías (dealer): ${allMemberships.length}`);
        allMemberships.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.name} - Activa: ${m.isActive} - Tipo: ${m.type}`);
        });
      } catch (debugError) {
        console.error('Error en debug:', debugError);
      }
    } else {
      console.log(`✅ [DEALER] Devolviendo ${memberships.length} membresías activas:`);
      memberships.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} - $${m.price}/${m.billingCycle}`);
      });
    }

    return NextResponse.json({ memberships: memberships || [] });
  } catch (error: any) {
    console.error('❌ [DEALER] Error fetching available memberships:', error);
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



