import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getPricingConfig, getStripeInstance, getStripeService } from '@autodealers/core';

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
      return NextResponse.json({ error: 'promotionId is required' }, { status: 400 });
    }

    // Obtener la promoción asignada
    const promotionRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('promotions')
      .doc(promotionId);

    const promotionDoc = await promotionRef.get();
    if (!promotionDoc.exists) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    const promotionData = promotionDoc.data();
    
    // Verificar que la promoción está asignada al usuario y pendiente de pago
    if (promotionData?.assignedTo !== auth.userId || 
        promotionData?.status !== 'assigned' || 
        promotionData?.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Invalid promotion status' }, { status: 400 });
    }

    // Obtener precio de la configuración
    const pricingConfig = await getPricingConfig();
    const price = promotionData.price || 
                  pricingConfig.promotions.seller.prices[promotionData.duration] || 
                  24.99;

    // Obtener información del usuario para crear cliente si es necesario
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener servicio de Stripe
    const stripeService = await getStripeService();
    const stripe = await getStripeInstance();

    // Obtener o crear cliente de Stripe
    let customerId: string | undefined;
    if (userData?.stripeCustomerId) {
      customerId = userData.stripeCustomerId;
    } else {
      const customer = await stripeService.createCustomer(
        userData?.email || `tenant-${auth.tenantId}@autodealers.com`,
        userData?.name || auth.tenantId,
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
        }
      );
      customerId = customer.id;

      await db.collection('users').doc(auth.userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Crear Payment Intent para pago integrado
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // Convertir a centavos
      currency: 'usd',
      customer: customerId,
      description: `Promoción Premium: ${promotionData.name}`,
      metadata: {
        type: 'assigned_promotion_payment',
        tenantId: auth.tenantId,
        promotionId: promotionId,
        userId: auth.userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Guardar el paymentIntentId en la promoción
    await promotionRef.update({
      paymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      promotionId: promotionId,
    });
  } catch (error: any) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


