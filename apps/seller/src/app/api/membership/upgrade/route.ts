export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getMembershipById } from '@autodealers/billing';
import { getFirestore, getStripeService } from '@autodealers/core';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Obtener el plan seleccionado
    const plan = await getMembershipById(planId);
    if (!plan || !plan.stripePriceId) {
      return NextResponse.json(
        { error: 'Invalid plan or Stripe not configured' },
        { status: 400 }
      );
    }

    // Obtener email del usuario
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener servicio de Stripe
    const stripeService = await getStripeService();

    // Crear sesión de Stripe Checkout para suscripción (con tax automático)
    const checkoutSession = await stripeService.createSubscriptionCheckoutSession({
      tenantId: auth.tenantId,
      priceId: plan.stripePriceId,
      customerEmail: userData?.email,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/membership?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/membership?canceled=true`,
      metadata: {
        tenantId: auth.tenantId,
        membershipId: planId,
        userId: auth.userId,
      },
    });

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error('Error creating upgrade session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

