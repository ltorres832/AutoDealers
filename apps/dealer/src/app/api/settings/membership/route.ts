import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionByTenantId } from '@autodealers/billing';
import { getMembershipById } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRÍTICO: Verificar TANTO suscripción COMO usuario directamente
    const { getFirestore, getUserById } = await import('@autodealers/core');
    const db = getFirestore();
    
    // Obtener usuario completo para verificar membershipId
    const user = await getUserById(auth.userId);
    const userMembershipId = user?.membershipId;
    
    // Obtener suscripción
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    const subscriptionMembershipId = subscription?.membershipId;
    
    // Usar membershipId de suscripción O del usuario (priorizar suscripción)
    const membershipId = subscriptionMembershipId || userMembershipId;
    
    console.log('🔍 [MEMBERSHIP API] Verificando membresía:', {
      userId: auth.userId,
      tenantId: auth.tenantId,
      userMembershipId,
      subscriptionMembershipId,
      membershipIdToUse: membershipId,
    });
    
    if (!membershipId) {
      console.log('⚠️ [MEMBERSHIP API] No hay membershipId ni en suscripción ni en usuario');
      return NextResponse.json({ error: 'No membership found' }, { status: 404 });
    }

    const membership = await getMembershipById(membershipId);
    
    if (!membership) {
      console.log('⚠️ [MEMBERSHIP API] Membresía no encontrada con ID:', membershipId);
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    console.log('✅ [MEMBERSHIP API] Membresía encontrada:', membership.name);
    return NextResponse.json({ membership });
  } catch (error: any) {
    console.error('❌ [MEMBERSHIP API] Error fetching membership:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
