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
    const { promotionScope, vehicleId, duration, paymentMethodId } = body;

    if (!promotionScope || !['vehicle', 'seller'].includes(promotionScope)) {
      return NextResponse.json(
        { error: 'Invalid promotion scope. Sellers can only purchase vehicle or seller promotions' },
        { status: 400 }
      );
    }

    // Validar duración usando configuración
    const { getPromotionDurations } = await import('@autodealers/core');
    const availableDurations = await getPromotionDurations(promotionScope);
    
    if (!duration || !availableDurations.includes(duration)) {
      return NextResponse.json(
        { error: `Invalid duration. Available durations: ${availableDurations.join(', ')} days` },
        { status: 400 }
      );
    }

    if (promotionScope === 'vehicle' && !vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required for vehicle promotions' },
        { status: 400 }
      );
    }

    // Obtener precio desde configuración
    const { getPromotionPrice } = await import('@autodealers/core');
    const price = await getPromotionPrice(promotionScope, duration);

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: `Invalid price configuration for ${promotionScope} promotion with ${duration} days` },
        { status: 400 }
      );
    }

    // Verificar límite global de promociones activas (12 máximo)
    const activePromotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isPaid', '==', true)
      .where('status', '==', 'active')
      .get();

    if (activePromotionsSnapshot.size >= 12) {
      return NextResponse.json(
        { 
          error: 'Límite alcanzado',
          message: 'Ya hay 12 promociones activas. Por favor espera a que expire alguna.'
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

    // Guardar solicitud de promoción pagada
    const requestRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests')
      .doc();

    // Crear Payment Intent para pago integrado
    const paymentIntent = await stripeService.createPaymentIntent(
      price,
      'usd',
      `Promoción ${promotionScope} - ${duration} días`,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        promotionScope,
        vehicleId: vehicleId || null,
        duration,
        type: 'paid_promotion',
      },
      customerId,
      paymentMethodId // Método de pago guardado (opcional)
    );

    // Guardar la solicitud con el paymentIntentId
    await requestRef.set({
      promotionScope,
      vehicleId: vehicleId || null,
      duration,
      price,
      status: 'pending_payment',
      paymentIntentId: paymentIntent.id,
      requestedBy: auth.userId,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Si se usó un método guardado y el pago se completó automáticamente
    if (paymentMethodId && paymentIntent.status === 'succeeded') {
      // Actualizar la solicitud directamente
      await requestRef.update({
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        requestId: requestRef.id,
        price: price,
        paymentCompleted: true,
      });
    }

    // Si requiere autenticación adicional (3D Secure) o es una nueva tarjeta
    if (paymentIntent.status === 'requires_action' && paymentIntent.next_action) {
      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        requestId: requestRef.id,
        price: price,
        requiresAction: true,
      });
    }

    // Si es una nueva tarjeta sin método guardado
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      requestId: requestRef.id,
      price: price, // Incluir el precio en la respuesta
    });
  } catch (error: any) {
    console.error('Error purchasing paid promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

