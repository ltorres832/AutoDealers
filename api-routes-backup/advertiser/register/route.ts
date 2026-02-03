import { NextRequest, NextResponse } from 'next/server';
import { createAdvertiser, getStripePriceId, getStripeInstance } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      website,
      industry,
      plan,
      message,
    } = body;

    // Validaciones
    if (!companyName || !contactName || !email || !plan) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!['starter', 'professional', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      );
    }

    // Crear anunciante en Firestore
    const advertiser = await createAdvertiser({
      email,
      companyName,
      contactName,
      phone,
      website,
      industry: industry || 'other',
      status: 'pending',
      plan: plan as 'starter' | 'professional' | 'premium',
    });

    const stripe = await getStripeInstance();

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      name: companyName,
      metadata: {
        advertiserId: advertiser.id,
        contactName,
        industry,
      },
    });

    // Actualizar anunciante con Stripe Customer ID
    // @ts-ignore - carga diferida para evitar errores de tipos en build
    const { getFirestore } = require('@autodealers/core') as any;
    const db = getFirestore();
    await db.collection('advertisers').doc(advertiser.id).update({
      stripeCustomerId: customer.id,
    });

    // Obtener Price ID desde Firestore (configurado por admin)
    const priceId = await getStripePriceId(plan as 'starter' | 'professional' | 'premium');
    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan no configurado. El administrador debe configurar los precios de Stripe en el panel de administración.' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/advertiser/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/advertise`,
      metadata: {
        advertiserId: advertiser.id,
        plan,
      },
    });

    return NextResponse.json({
      success: true,
      advertiserId: advertiser.id,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    console.error('Error registering advertiser:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

