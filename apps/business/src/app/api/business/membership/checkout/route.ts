import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { getFirestore, getStripeInstance, salesEmployeeMetadataForTenant } from '@autodealers/core';
import {
  getMembershipById,
  assertSelfServiceMembership,
  resolveMembershipPricing,
  getMembershipTrialDays,
  getSubscriptionByTenantId,
} from '@autodealers/billing';
import { resolveBusinessUrl } from '@autodealers/shared/platform-urls';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const membershipId = String(body.membershipId || '').trim();
  if (!membershipId) {
    return NextResponse.json({ error: 'Selecciona un plan' }, { status: 400 });
  }

  const membership = await getMembershipById(membershipId);
  if (!membership || membership.type !== 'business' || membership.isActive === false) {
    return NextResponse.json({ error: 'Plan de negocio no válido' }, { status: 400 });
  }

  const selectable = assertSelfServiceMembership(membership);
  if (!selectable.ok) {
    return NextResponse.json({ error: selectable.error || 'Plan no disponible' }, { status: 403 });
  }

  const pricing = resolveMembershipPricing(membership as unknown as Record<string, unknown>);
  if (!pricing.checkoutStripePriceId) {
    return NextResponse.json(
      { error: 'Este plan aún no tiene un precio de Stripe en vivo. Contacta a soporte.' },
      { status: 400 }
    );
  }

  const db = getFirestore();
  const [userSnap, existingSub] = await Promise.all([
    db.collection('users').doc(auth.userId).get(),
    getSubscriptionByTenantId(auth.tenantId),
  ]);
  const user = userSnap.data() || {};
  const stripe = await getStripeInstance();

  let customerId = String(existingSub?.stripeCustomerId || user.stripeCustomerId || '').trim();
  if (customerId && !customerId.startsWith('cus_')) customerId = '';

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: String(user.email || ''),
      name: String(user.name || user.email || 'Negocio automotriz'),
      metadata: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        accountType: 'business',
      },
    });
    customerId = customer.id;
    await db.collection('users').doc(auth.userId).set(
      {
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await db.collection('tenants').doc(auth.tenantId).set(
      {
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  let taxRateId: string | undefined;
  try {
    const taxRates = await stripe.taxRates.list({ limit: 100 });
    const existingTaxRate = taxRates.data.find((tr) => tr.percentage === 11.5 && tr.active);
    taxRateId = existingTaxRate?.id;
    if (!taxRateId) {
      const created = await stripe.taxRates.create({
        display_name: 'IVA',
        description: 'Impuesto al Valor Agregado',
        percentage: 11.5,
        inclusive: false,
      });
      taxRateId = created.id;
    }
  } catch {
    taxRateId = undefined;
  }

  const trialDays = existingSub ? 0 : getMembershipTrialDays();
  const baseUrl = resolveBusinessUrl();
  const employeeMeta = await salesEmployeeMetadataForTenant(auth.tenantId);
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: pricing.checkoutStripePriceId,
        quantity: 1,
        tax_rates: taxRateId ? [taxRateId] : undefined,
      },
    ],
    mode: 'subscription',
    success_url: `${baseUrl}/dashboard/membership?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/membership?canceled=true`,
    metadata: {
      userId: auth.userId,
      tenantId: auth.tenantId,
      membershipId,
      accountType: 'business',
      source: 'business_subscribe',
      ...employeeMeta,
    },
    subscription_data: {
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      metadata: {
        userId: auth.userId,
        tenantId: auth.tenantId,
        membershipId,
        accountType: 'business',
        source: 'business_subscribe',
        ...employeeMeta,
      },
    },
    allow_promotion_codes: true,
    payment_method_collection: 'always',
  });

  return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
}
