import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getSubscriptionByTenantId } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico para verificar el estado completo del usuario
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    
    // Obtener usuario completo
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Obtener tenant completo
    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;
    
    // Obtener suscripción
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    // Buscar todas las suscripciones del tenant
    const allSubscriptions = await db
      .collection('subscriptions')
      .where('tenantId', '==', auth.tenantId)
      .get();
    
    // Obtener membresía si existe
    let membershipData = null;
    if (userData?.membershipId) {
      const membershipDoc = await db.collection('memberships').doc(userData.membershipId).get();
      membershipData = membershipDoc.exists ? membershipDoc.data() : null;
    }

    return NextResponse.json({
      userId: auth.userId,
      tenantId: auth.tenantId,
      user: {
        id: userData?.id || auth.userId,
        email: userData?.email,
        name: userData?.name,
        role: userData?.role,
        status: userData?.status,
        membershipId: userData?.membershipId,
        tenantId: userData?.tenantId,
        createdAt: userData?.createdAt?.toDate?.()?.toISOString(),
        updatedAt: userData?.updatedAt?.toDate?.()?.toISOString(),
      },
      tenant: {
        id: tenantData?.id || auth.tenantId,
        name: tenantData?.name,
        status: tenantData?.status,
        membershipId: tenantData?.membershipId,
        createdAt: tenantData?.createdAt?.toDate?.()?.toISOString(),
        updatedAt: tenantData?.updatedAt?.toDate?.()?.toISOString(),
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        membershipId: subscription.membershipId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
      } : null,
      allSubscriptions: allSubscriptions.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        currentPeriodStart: doc.data()?.currentPeriodStart?.toDate?.()?.toISOString(),
        currentPeriodEnd: doc.data()?.currentPeriodEnd?.toDate?.()?.toISOString(),
      })),
      membership: membershipData ? {
        id: userData?.membershipId,
        name: membershipData?.name,
        type: membershipData?.type,
        price: membershipData?.price,
        isActive: membershipData?.isActive,
      } : null,
      diagnosis: {
        hasUserMembershipId: !!userData?.membershipId,
        hasTenantMembershipId: !!tenantData?.membershipId,
        userStatus: userData?.status,
        tenantStatus: tenantData?.status,
        hasSubscription: !!subscription,
        subscriptionStatus: subscription?.status,
        subscriptionMatchesUserMembership: subscription?.membershipId === userData?.membershipId,
      },
    });
  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json(
      { error: 'Error al obtener diagnóstico', details: error.message },
      { status: 500 }
    );
  }
}



