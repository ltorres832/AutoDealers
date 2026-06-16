import { NextRequest, NextResponse } from 'next/server';
import { getPublicSiteOrigin } from '@/lib/public-site-origin';
import { getStripeInstance, getFirestore, isTenantSubdomainSlugAvailable } from '@autodealers/core';
import { isCatalogMembership, assertSelfServiceMembership } from '@autodealers/billing/membership-visibility';
import { getMembershipTrialDays } from '@autodealers/billing/membership-trial';
import { membershipIncludesSubdomain } from '@/lib/subdomain-registration';

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

    const membershipDoc = await db.collection('memberships').doc(membershipId).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { error: 'Membresía no encontrada' },
        { status: 404 }
      );
    }
    const membership = membershipDoc.data()!;

    const selectable = assertSelfServiceMembership({
      id: membershipId,
      name: membership.name as string,
      type: membership.type as string,
      billingCycle: (membership.billingCycle as string | null | undefined) ?? null,
      isActive: membership.isActive !== false && membership.status !== 'inactive',
    });
    if (!selectable.ok) {
      return NextResponse.json({ error: selectable.error || 'Plan no disponible.' }, { status: 403 });
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const pendingSubdomain = String(tenantDoc.data()?.pendingSubdomain || '').trim();
    const planAllowsSubdomain = membershipIncludesSubdomain(
      membership.features as Record<string, unknown> | undefined
    );

    if (pendingSubdomain && !planAllowsSubdomain) {
      return NextResponse.json(
        {
          error:
            'El plan seleccionado no incluye página web con subdominio propio. Elige un plan con subdominio o regístrate de nuevo sin subdominio.',
          code: 'SUBDOMAIN_NOT_IN_PLAN',
        },
        { status: 400 }
      );
    }

    if (pendingSubdomain && planAllowsSubdomain) {
      const stillAvailable = await isTenantSubdomainSlugAvailable(pendingSubdomain, tenantId);
      if (!stillAvailable) {
        return NextResponse.json(
          { error: 'El subdominio elegido ya no está disponible. Vuelve al registro y elige otro.' },
          { status: 400 }
        );
      }
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

    const siteOrigin = getPublicSiteOrigin(request);
    const trialDays = getMembershipTrialDays();

    // Checkout: tarjeta obligatoria + trial de 7 días; Stripe cobra al terminar el trial
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
      mode: 'subscription',
      success_url: `${siteOrigin}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteOrigin}/register/membership?type=${accountType}&userId=${userId}&registered=true`,
      metadata: {
        userId,
        tenantId,
        membershipId,
        accountType,
        source: 'registration',
        trialDays: String(trialDays),
      },
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          userId,
          tenantId,
          membershipId,
          accountType,
          source: 'registration',
        },
      },
      allow_promotion_codes: true,
      payment_method_collection: 'always',
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      trialDays,
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

