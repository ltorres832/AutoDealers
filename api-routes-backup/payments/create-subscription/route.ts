import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeInstance } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, customerId, metadata } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID es requerido' },
        { status: 400 }
      );
    }

    const stripe = await getStripeInstance();

    // Crear o obtener cliente
    let customer: Stripe.Customer;
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } else {
      return NextResponse.json(
        { error: 'Customer ID es requerido para suscripciones' },
        { status: 400 }
      );
    }

    // Crear suscripción con payment_behavior: 'default_incomplete'
    // Esto requiere que el usuario confirme el pago antes de activar la suscripción
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: metadata || {},
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Error al crear la suscripción', details: error.message },
      { status: 500 }
    );
  }
}

