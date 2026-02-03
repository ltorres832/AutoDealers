import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionByTenantId } from '@autodealers/billing';
import { getMembershipById } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      console.error('❌ [SELLER MEMBERSHIP] Unauthorized - No auth or tenantId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔍 [SELLER MEMBERSHIP] Obteniendo membresía para tenant: ${auth.tenantId}`);
    
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    if (!subscription) {
      console.warn(`⚠️ [SELLER MEMBERSHIP] No subscription found for tenant: ${auth.tenantId}`);
      return NextResponse.json({ 
        error: 'No subscription found',
        message: 'No tienes una suscripción activa. Por favor, selecciona un plan de membresía.'
      }, { status: 404 });
    }

    console.log(`📦 [SELLER MEMBERSHIP] Subscription found - membershipId: ${subscription.membershipId}`);
    
    if (!subscription.membershipId) {
      console.error(`❌ [SELLER MEMBERSHIP] Subscription exists but has no membershipId`);
      return NextResponse.json({ 
        error: 'Invalid subscription',
        message: 'Tu suscripción no tiene un plan de membresía asociado. Contacta al soporte.'
      }, { status: 400 });
    }

    const membership = await getMembershipById(subscription.membershipId);
    
    if (!membership) {
      console.error(`❌ [SELLER MEMBERSHIP] Membership not found - ID: ${subscription.membershipId}`);
      return NextResponse.json({ 
        error: 'Membership not found',
        message: 'No se encontró información de membresía. Contacta al soporte.',
        membershipId: subscription.membershipId
      }, { status: 404 });
    }

    console.log(`✅ [SELLER MEMBERSHIP] Membership found: ${membership.name} (${membership.type}) - Activa: ${membership.isActive}`);
    
    return NextResponse.json({ membership });
  } catch (error: any) {
    console.error('❌ [SELLER MEMBERSHIP] Error fetching membership:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}



