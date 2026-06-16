import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStripeInstance, getFirestore } from '@autodealers/core';
import { getSubscriptionByTenantId } from '@autodealers/billing';
import { dealerManagedBillingResponse } from '@/lib/dealer-managed-guard';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerBlock = dealerManagedBillingResponse(auth);
    if (dealerBlock) return dealerBlock;

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
      if (subscription?.id) {
        await db.collection('subscriptions').doc(subscription.id).update({
          stripeCustomerId: customerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Crear SetupIntent para guardar método de pago
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        tenantId: auth.tenantId,
        userId: auth.userId,
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

