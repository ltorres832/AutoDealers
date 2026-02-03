import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStripeInstance } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import { getSubscriptionByTenantId } from '@autodealers/billing';
import { getMembershipById } from '@autodealers/billing';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { membershipId, paymentMethodId } = body;

    if (!membershipId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Membership ID and Payment Method ID are required' },
        { status: 400 }
      );
    }

    const stripe = await getStripeInstance();
    const db = getFirestore();

    // Obtener membresía
    const membership = await getMembershipById(membershipId);
    if (!membership || !membership.isActive || membership.type !== 'seller') {
      return NextResponse.json({ error: 'Invalid membership' }, { status: 400 });
    }

    if (!membership.stripePriceId) {
      return NextResponse.json(
        { error: 'Membership does not have a Stripe price configured' },
        { status: 400 }
      );
    }

    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener o crear cliente de Stripe
    let customerId: string;
    const subscription = await getSubscriptionByTenantId(auth.tenantId);
    
    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
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
    }

    // Adjuntar método de pago al cliente
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Establecer como método de pago por defecto
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Obtener o crear tax rate del 11.5%
    let taxRateId: string | undefined;
    try {
      const taxRates = await stripe.taxRates.list({ limit: 100 });
      const existingTaxRate = taxRates.data.find(
        (tr) => tr.percentage === 11.5 && tr.active
      );
      if (existingTaxRate) {
        taxRateId = existingTaxRate.id;
      } else {
        const newTaxRate = await stripe.taxRates.create({
          display_name: 'IVA',
          percentage: 11.5,
          inclusive: false,
        });
        taxRateId = newTaxRate.id;
      }
    } catch (error) {
      console.warn('Error obteniendo tax rate:', error);
    }

    // Crear o actualizar suscripción
    let stripeSubscriptionId: string;
    
    if (subscription?.stripeSubscriptionId) {
      // Actualizar suscripción existente
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: [{ id: subscription.stripeSubscriptionId, price: membership.stripePriceId }],
          default_payment_method: paymentMethodId,
          metadata: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            membershipId: membershipId,
          },
        }
      );
      stripeSubscriptionId = stripeSubscription.id;
    } else {
      // Crear nueva suscripción
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: membership.stripePriceId }],
        payment_settings: {
          payment_method_types: ['card', 'us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        ...(taxRateId && { default_tax_rates: [taxRateId] }),
        metadata: {
          tenantId: auth.tenantId,
          userId: auth.userId,
          membershipId: membershipId,
        },
      });
      stripeSubscriptionId = stripeSubscription.id;
    }

    // Actualizar o crear suscripción en Firestore
    if (subscription) {
      await db.collection('subscriptions').doc(subscription.id).update({
        membershipId: membershipId,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: customerId,
        status: 'active',
        currentPeriodStart: admin.firestore.Timestamp.fromDate(
          new Date(Date.now())
        ),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      const subscriptionRef = db.collection('subscriptions').doc();
      await subscriptionRef.set({
        id: subscriptionRef.id,
        tenantId: auth.tenantId,
        userId: auth.userId,
        membershipId: membershipId,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: customerId,
        status: 'active',
        currentPeriodStart: admin.firestore.Timestamp.fromDate(
          new Date(Date.now())
        ),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        ),
        cancelAtPeriodEnd: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Suscripción creada exitosamente',
      subscriptionId: stripeSubscriptionId,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

