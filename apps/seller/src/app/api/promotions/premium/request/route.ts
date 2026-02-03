export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeService } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promotionId } = body;

    if (!promotionId) {
      return NextResponse.json(
        { error: 'Missing required field: promotionId' },
        { status: 400 }
      );
    }

    // Obtener la promoción premium
    const promotionDoc = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('promotions')
      .doc(promotionId)
      .get();

    if (!promotionDoc.exists) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    const promotionData = promotionDoc.data();
    
    if (!promotionData?.isPremium) {
      return NextResponse.json(
        { error: 'This promotion is not premium' },
        { status: 400 }
      );
    }

    if (promotionData.price <= 0) {
      return NextResponse.json(
        { error: 'Invalid promotion price' },
        { status: 400 }
      );
    }

    // Obtener información del usuario/tenant
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener servicio de Stripe
    const stripeService = await getStripeService();

    // Obtener o crear cliente de Stripe
    let customerId: string | undefined;
    if (userData?.stripeCustomerId) {
      customerId = userData.stripeCustomerId;
    } else {
      // Crear cliente en Stripe
      const customer = await stripeService.createCustomer(
        userData?.email || `tenant-${auth.tenantId}@autodealers.com`,
        userData?.name || auth.tenantId,
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
        }
      );
      customerId = customer.id;

      // Guardar customer ID en el usuario
      await db.collection('users').doc(auth.userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Crear sesión de checkout
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
    const session = await stripeService.createCheckoutSession(
      promotionData.price,
      'usd',
      userData?.email,
      customerId,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        promotionId,
        type: 'premium_promotion',
        productName: promotionData.name || 'Promoción Premium',
      },
      `${baseUrl}/promotions/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/promotions?canceled=true`
    );

    // Guardar solicitud de promoción premium
    await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_promotion_requests')
      .doc(promotionId)
      .set({
        promotionId,
        status: 'pending_payment',
        stripeCheckoutSessionId: session.id,
        requestedBy: auth.userId,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        price: promotionData.price,
      });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error requesting premium promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

