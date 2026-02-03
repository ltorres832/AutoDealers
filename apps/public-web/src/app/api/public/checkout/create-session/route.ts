import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@autodealers/core';
import { getMembershipById } from '@autodealers/billing';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Crea una sesión de Stripe Checkout para pagar la membresía
 */
export async function POST(request: NextRequest) {
  try {
    const db = getFirestore();
    
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userId, membershipId, accountType, userEmail, userName } = body;

    if (!userId || !membershipId || !accountType || !userEmail || !userName) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userDoc.data();
    const tenantId = user?.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Usuario no tiene tenant asociado' },
        { status: 400 }
      );
    }

    // Obtener información de la membresía
    const membership = await getMembershipById(membershipId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Membresía no encontrada' },
        { status: 404 }
      );
    }

    if (!membership.stripePriceId) {
      return NextResponse.json(
        { error: 'La membresía no tiene configurado un precio de Stripe. Contacta al administrador.' },
        { status: 400 }
      );
    }

    // Obtener instancia de Stripe
    const stripe = await getStripeInstance();

    // Crear o obtener cliente de Stripe
    let customerId: string;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId,
          tenantId,
          accountType,
        },
      });
      customerId = customer.id;
    }

    // Obtener o crear tax rate del 11.5%
    let taxRateId: string | undefined;
    try {
      const taxRates = await stripe.taxRates.list({ limit: 100 });
      const existingTaxRate = taxRates.data.find(
        (tr: any) => tr.percentage === 11.5 && tr.active
      );
      if (existingTaxRate) {
        taxRateId = existingTaxRate.id;
      } else {
        const newTaxRate = await stripe.taxRates.create({
          display_name: 'IVA',
          description: 'Impuesto al Valor Agregado',
          percentage: 11.5,
          inclusive: false,
        });
        taxRateId = newTaxRate.id;
      }
    } catch (taxError) {
      console.warn('Error obteniendo tax rate, continuando sin tax:', taxError);
    }

    // Crear sesión de checkout con suscripción recurrente (facturación cada 30 días)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: membership.stripePriceId,
          quantity: 1,
          tax_rates: taxRateId ? [taxRateId] : undefined,
        },
      ],
      mode: 'subscription', // Modo suscripción para facturación recurrente automática
      success_url: `${request.nextUrl.origin}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/register/membership?type=${accountType}&userId=${userId}&registered=true`,
      metadata: {
        userId,
        tenantId,
        membershipId,
        accountType,
        source: 'registration', // Identificar que viene del registro
      },
      subscription_data: {
        metadata: {
          userId,
          tenantId,
          membershipId,
          accountType,
          source: 'registration',
        },
        // Configurar facturación automática cada 30 días
        billing_cycle_anchor: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 días desde ahora
      },
      allow_promotion_codes: true,
      // Configurar para que el pago se procese inmediatamente y active la cuenta
      payment_method_collection: 'always',
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        error: error.message || 'Error al crear sesión de pago',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

