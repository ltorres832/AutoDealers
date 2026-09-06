export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  createSalesEmployeePaymentLink,
  getFirestore,
  getStripeInstance,
  listMembershipCatalog,
  listSalesEmployeeAccounts,
  salesEmployeeMetadataForTenant,
} from '@autodealers/core';
import { assertSelfServiceMembership } from '@autodealers/billing/membership-visibility';
import { resolveMembershipPricing } from '@autodealers/billing/membership-promo-pricing';
import { getMembershipTrialDays } from '@autodealers/billing/membership-trial';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const accountId = String(body.accountId || '').trim();
    const membershipId = String(body.membershipId || '').trim();
    if (!accountId || !membershipId) {
      return NextResponse.json({ error: 'Selecciona la cuenta y el plan' }, { status: 400 });
    }

    const accounts = await listSalesEmployeeAccounts(auth.salesEmployeeId);
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    const memberships = await listMembershipCatalog({ type: account.role, activeOnly: true });
    const membership = memberships.find((item) => item.id === membershipId);
    if (!membership) {
      return NextResponse.json({ error: 'Membresía no válida para este tipo de cuenta' }, { status: 400 });
    }

    const selectable = assertSelfServiceMembership({
      id: membership.id,
      name: membership.name,
      type: membership.type,
      billingCycle: membership.billingCycle,
      isActive: membership.isActive,
      features: membership.features,
    });
    if (!selectable.ok) {
      return NextResponse.json({ error: selectable.error || 'Plan no disponible' }, { status: 403 });
    }

    const pricing = resolveMembershipPricing(membership as Record<string, unknown>);
    if (!pricing.checkoutStripePriceId) {
      return NextResponse.json({ error: 'El plan no tiene precio de Stripe' }, { status: 400 });
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(account.userId).get();
    const user = userDoc.data() || {};
    const stripe = await getStripeInstance();
    const employeeMeta = await salesEmployeeMetadataForTenant(account.tenantId);
    const trialDays = getMembershipTrialDays();
    const base = resolvePublicWebUrl();

    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: account.email, limit: 1 });
    if (existing.data[0]) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: account.email,
        name: String(user.name || account.name),
        metadata: {
          userId: account.userId,
          tenantId: account.tenantId,
          accountType: account.role,
          ...employeeMeta,
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: pricing.checkoutStripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${base}/sales/dashboard?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/sales/dashboard?paid=0`,
      metadata: {
        userId: account.userId,
        tenantId: account.tenantId,
        membershipId,
        accountType: account.role,
        source: 'sales_employee',
        employeeId: auth.salesEmployeeId,
      },
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          userId: account.userId,
          tenantId: account.tenantId,
          membershipId,
          accountType: account.role,
          source: 'sales_employee',
          employeeId: auth.salesEmployeeId,
        },
      },
      payment_method_collection: 'always',
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe no devolvió el link' }, { status: 500 });
    }

    const linkId = await createSalesEmployeePaymentLink({
      employeeId: auth.salesEmployeeId,
      accountId,
      membershipId,
      checkoutUrl: session.url,
      stripeSessionId: session.id,
    });

    return NextResponse.json({
      success: true,
      linkId,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el link';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
