import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeService, getPromotionPrice, getPromotionDurations } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promotionRequestId } = body;

    if (!promotionRequestId) {
      return NextResponse.json(
        { error: 'Missing promotionRequestId' },
        { status: 400 }
      );
    }

    // Obtener la solicitud de promoción asignada
    const requestRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests')
      .doc(promotionRequestId);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Promoción asignada no encontrada' },
        { status: 404 }
      );
    }

    const requestData = requestDoc.data();
    
    // Verificar que la promoción está asignada y pendiente de pago
    if (requestData?.status !== 'assigned' || requestData?.paymentStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Esta promoción no está disponible para pago' },
        { status: 400 }
      );
    }

    // Verificar que la promoción fue asignada al usuario actual
    if (requestData?.assignedTo !== auth.userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para pagar esta promoción' },
        { status: 403 }
      );
    }

    // Verificar límite global de promociones activas
    const { getPricingConfig } = await import('@autodealers/core');
    const pricingConfig = await getPricingConfig();
    const maxActive = pricingConfig.limits.maxActivePromotions;

    const activePromotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isPaid', '==', true)
      .where('status', '==', 'active')
      .get();

    if (activePromotionsSnapshot.size >= maxActive) {
      return NextResponse.json(
        { 
          error: 'Límite alcanzado',
          message: `Ya hay ${maxActive} promociones activas. Por favor espera a que expire alguna.`
        },
        { status: 400 }
      );
    }

    // Obtener servicio de Stripe
    const stripeService = await getStripeService();

    // Obtener información del usuario/tenant
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

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
    const paymentIntent = await stripeService.createPaymentIntent(
      requestData.price,
      'usd',
      requestData.name || `Promoción ${requestData.promotionScope} - ${requestData.duration} días`,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'paid_promotion',
        promotionRequestId: promotionRequestId,
        isAssigned: 'true',
        promotionScope: requestData.promotionScope,
        vehicleId: requestData.vehicleId || null,
        duration: requestData.duration,
      },
      customerId
    );

    // Actualizar solicitud con el ID del Payment Intent
    await requestRef.update({
      paymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      requestId: promotionRequestId,
    });
  } catch (error: any) {
    console.error('Error paying assigned promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


