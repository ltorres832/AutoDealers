import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionByTenantId } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      console.log('❌ [SUBSCRIPTION API] No auth o tenantId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [SUBSCRIPTION API] Buscando suscripción para tenantId:', auth.tenantId);
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    console.log('🔍 [SUBSCRIPTION API] Resultado de getSubscriptionByTenantId:', {
      found: !!subscription,
      id: subscription?.id,
      status: subscription?.status,
      membershipId: subscription?.membershipId,
    });
    
    if (!subscription) {
      console.log('⚠️ [SUBSCRIPTION API] No se encontró suscripción para tenantId:', auth.tenantId);
      return NextResponse.json({ subscription: null });
    }

    const subscriptionData = {
      id: subscription.id,
      tenantId: subscription.tenantId,
      membershipId: subscription.membershipId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      daysPastDue: subscription.daysPastDue,
      statusReason: (subscription as any).statusReason,
    };

    console.log('✅ [SUBSCRIPTION API] Devolviendo suscripción:', {
      id: subscriptionData.id,
      status: subscriptionData.status,
      membershipId: subscriptionData.membershipId,
    });

    return NextResponse.json({
      subscription: subscriptionData,
    });
  } catch (error: any) {
    console.error('❌ [SUBSCRIPTION API] Error fetching subscription:', error);
    console.error('❌ [SUBSCRIPTION API] Stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



