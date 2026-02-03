import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStripeInstance, getFirestore } from '@autodealers/core';
import { getSubscriptionByTenantId } from '@autodealers/billing';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { methodType } = await request.json();
    const paymentMethodType = methodType === 'us_bank_account' ? 'us_bank_account' : 'card';

    const stripe = await getStripeInstance();
    const db = getFirestore();

    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener o crear cliente de Stripe
    let customerId: string;
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
    } else if (userData?.stripeCustomerId) {
      customerId = userData.stripeCustomerId;
    } else {
      // Crear cliente en Stripe
      const customer = await stripe.customers.create({
        email: userData?.email,
        name: userData?.name || userData?.email,
        metadata: {
          tenantId: auth.tenantId,
          userId: auth.userId,
        },
      });
      customerId = customer.id;

      // Guardar customerId en el usuario y tenant
      await db.collection('users').doc(auth.userId).update({
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      await db.collection('tenants').doc(auth.tenantId).update({
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Guardar customerId en la suscripción si existe
      if (subscription) {
        await db.collection('subscriptions').doc(subscription.id).update({
          stripeCustomerId: customerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Crear Checkout Session para agregar método de pago
    // Stripe automáticamente mostrará los métodos guardados del customer si existen
    // El usuario podrá seleccionar un método existente o agregar uno nuevo
    const baseUrl = process.env.NEXT_PUBLIC_SELLER_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: [paymentMethodType],
      customer: customerId,
      // Al pasar el customer, Stripe automáticamente mostrará sus métodos guardados
      // El usuario podrá seleccionar uno existente o agregar uno nuevo
      success_url: `${baseUrl}/settings/membership/payment-methods?success=true`,
      cancel_url: `${baseUrl}/settings/membership/payment-methods?canceled=true`,
      metadata: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: 'add_payment_method',
        methodType: paymentMethodType,
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('Error creating setup session:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}

