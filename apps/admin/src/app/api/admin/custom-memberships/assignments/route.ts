export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuth } from '@/lib/auth';
import {
  assignSellerToDealerDirect,
  createUser,
  finalizeUserRegistration,
  getFirestore,
  getStripeInstance,
  normalizeLoginEmail,
  sendOutboundEmail,
  transferSellerToDealer,
} from '@autodealers/core';
import { serializeFirestoreDoc } from '@/lib/serialize-firestore';
import { resolveDealerUrl, resolveSellerUrl } from '@autodealers/shared/platform-urls';

const db = getFirestore();

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'suspended'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

function isActiveStatus(status: string | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

function customPlanKind(membership: Record<string, unknown>): 'seller' | 'dealer' | 'multi_dealer' {
  const features = membership.features as Record<string, unknown> | undefined;
  if (membership.customMembershipKind === 'multi_dealer' || features?.customMembershipKind === 'multi_dealer') {
    return 'multi_dealer';
  }
  if (membership.type === 'dealer') return 'dealer';
  return 'seller';
}

function addBillingPeriod(start: Date, billingCycle: string): Date {
  const end = new Date(start);
  if (billingCycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function stripeSecondsToDate(value: unknown): Date | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000) : undefined;
}

function subscriptionDates(stripeSub: any, fallbackCycle: string): {
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  nextPaymentDate?: Date;
} {
  const now = new Date();
  const status = String(stripeSub?.status || 'incomplete') as SubscriptionStatus;
  const currentPeriodStart = stripeSecondsToDate(stripeSub?.current_period_start) || now;
  const currentPeriodEnd =
    stripeSecondsToDate(stripeSub?.current_period_end) || addBillingPeriod(now, fallbackCycle);
  const trialEndsAt = stripeSecondsToDate(stripeSub?.trial_end);
  const nextPaymentDate =
    trialEndsAt ||
    stripeSecondsToDate(stripeSub?.latest_invoice?.next_payment_attempt) ||
    currentPeriodEnd;

  return { status, currentPeriodStart, currentPeriodEnd, trialEndsAt, nextPaymentDate };
}

async function listSubscriptionsForTenant(tenantId: string): Promise<Array<Record<string, any>>> {
  let snap;
  try {
    snap = await db.collection('subscriptions').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').get();
  } catch {
    snap = await db.collection('subscriptions').where('tenantId', '==', tenantId).get();
  }
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function applyMembershipToTenantAndUsers(tenantId: string, membershipId: string): Promise<void> {
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const tenantRef = db.collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();
  if (tenantDoc.exists) {
    await tenantRef.update({ membershipId, updatedAt: ts });
  }

  const usersSnap = await db.collection('users').where('tenantId', '==', tenantId).get();
  const batch = db.batch();
  for (const userDoc of usersSnap.docs) {
    batch.update(userDoc.ref, { membershipId, updatedAt: ts });
  }
  if (!usersSnap.empty) await batch.commit();
}

async function resolveDealerOwnerUserId(dealerTenantId: string): Promise<string> {
  const tenantSnap = await db.collection('tenants').doc(dealerTenantId).get();
  const ownerId = String(tenantSnap.data()?.ownerId || '').trim();
  if (ownerId) return ownerId;
  const usersSnap = await db
    .collection('users')
    .where('tenantId', '==', dealerTenantId)
    .where('role', 'in', ['dealer', 'master_dealer', 'dealer_admin'])
    .limit(1)
    .get();
  return usersSnap.empty ? '' : usersSnap.docs[0].id;
}

async function ensureDealerNetworkForAssignment(params: {
  userId: string;
  tenantId: string;
  membershipId: string;
  assignmentId: string;
  membership: Record<string, unknown>;
  assignedByAdminId: string;
}): Promise<string | null> {
  const planKind = customPlanKind(params.membership);
  if (planKind !== 'multi_dealer') return null;

  const features = params.membership.features as Record<string, unknown> | undefined;
  const dealerNames = Array.isArray(features?.dealerNames)
    ? features.dealerNames.map((name) => String(name).trim()).filter(Boolean)
    : [];
  const maxDealers =
    typeof features?.maxDealers === 'number' && Number.isFinite(features.maxDealers)
      ? features.maxDealers
      : null;

  if (dealerNames.length === 0) {
    throw new Error('La membresía Multi Dealer no tiene nombres de dealers configurados.');
  }
  if (maxDealers !== null && dealerNames.length > maxDealers) {
    throw new Error(`La red tiene ${dealerNames.length} dealers, pero el límite es ${maxDealers}.`);
  }

  const tenantSnap = await db.collection('tenants').doc(params.tenantId).get();
  const tenantData = tenantSnap.data() || {};
  const primaryName = String(
    tenantData.businessName || tenantData.companyName || tenantData.name || dealerNames[0] || 'Dealer principal'
  ).trim();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const existing = await db
    .collection('dealer_networks')
    .where('ownerUserId', '==', params.userId)
    .where('primaryTenantId', '==', params.tenantId)
    .limit(1)
    .get();

  const networkRef = existing.empty
    ? db.collection('dealer_networks').doc()
    : existing.docs[0].ref;
  const networkId = networkRef.id;

  const normalizedNames = dealerNames.length > 0 ? dealerNames : [primaryName];
  const roster = normalizedNames.map((name, index) => {
    const isPrimary =
      index === 0 ||
      name.toLowerCase() === primaryName.toLowerCase() ||
      normalizedNames.length === 1;
    return {
      name,
      displayName: name,
      tenantId: isPrimary ? params.tenantId : null,
      role: isPrimary ? 'primary' : 'member',
      status: isPrimary ? 'active' : 'pending_tenant_link',
      addedBy: params.assignedByAdminId,
      addedAt: now,
    };
  });

  if (!roster.some((dealer) => dealer.tenantId === params.tenantId)) {
    roster.unshift({
      name: primaryName,
      displayName: primaryName,
      tenantId: params.tenantId,
      role: 'primary',
      status: 'active',
      addedBy: params.assignedByAdminId,
      addedAt: now,
    });
  }

  await networkRef.set(
    {
      id: networkId,
      ownerUserId: params.userId,
      primaryTenantId: params.tenantId,
      membershipId: params.membershipId,
      customMembershipAssignmentId: params.assignmentId,
      maxDealers,
      status: 'active',
      dealerNames: normalizedNames,
      dealers: roster,
      updatedAt: now,
      ...(existing.empty ? { createdAt: now, createdByPlatformAdminId: params.assignedByAdminId } : {}),
    },
    { merge: true }
  );

  await Promise.all([
    db.collection('users').doc(params.userId).update({
      dealerNetworkId: networkId,
      associatedDealers: admin.firestore.FieldValue.arrayUnion(params.tenantId),
      updatedAt: now,
    }),
    db.collection('tenants').doc(params.tenantId).set(
      {
        dealerNetworkId: networkId,
        multiDealerPrimary: true,
        updatedAt: now,
      },
      { merge: true }
    ),
  ]);

  return networkId;
}

async function provisionAccountForCustomMembership(params: {
  membership: Record<string, unknown>;
  account: Record<string, unknown>;
  adminUserId: string;
}): Promise<{ userId: string; tenantId: string; email: string; name: string; role: 'seller' | 'dealer' }> {
  const planKind = customPlanKind(params.membership);
  const role = planKind === 'seller' ? 'seller' : 'dealer';
  const name = String(params.account.name || '').trim();
  const email = normalizeLoginEmail(String(params.account.email || ''));
  const password = String(params.account.password || '').trim();
  const phone = String(params.account.phone || '').trim();
  const companyName = String(params.account.companyName || name).trim();
  const businessName = String(params.account.businessName || companyName || name).trim();
  const contactEmail = normalizeLoginEmail(String(params.account.contactEmail || email || ''));
  const contactPhone = String(params.account.contactPhone || phone).trim();
  const whatsapp = String(params.account.whatsapp || '').trim();
  const taxId = String(params.account.taxId || '').trim();
  const address = String(params.account.address || '').trim();
  const city = String(params.account.city || '').trim();
  const state = String(params.account.state || '').trim();
  const postalCode = String(params.account.postalCode || '').trim();
  const country = String(params.account.country || '').trim();
  const website = String(params.account.website || '').trim();
  const subdomain = String(params.account.subdomain || '').trim().toLowerCase();
  const dealerId = String(params.account.dealerId || '').trim();

  if (!name || !email || !password) {
    throw new Error('Para crear una cuenta nueva necesitas nombre, email y contraseña temporal.');
  }
  if (password.length < 6) {
    throw new Error('La contraseña temporal debe tener al menos 6 caracteres.');
  }
  if (role === 'seller' && dealerId) {
    const dealerSnap = await db.collection('tenants').doc(dealerId).get();
    if (!dealerSnap.exists || dealerSnap.data()?.type !== 'dealer') {
      throw new Error('El dealer seleccionado para el vendedor no existe.');
    }
  }
  if (subdomain) {
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(subdomain)) {
      throw new Error('El subdominio solo puede usar letras minúsculas, números y guiones.');
    }
    const duplicateSubdomain = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();
    const duplicatePendingSubdomain = await db
      .collection('tenants')
      .where('pendingSubdomain', '==', subdomain)
      .limit(1)
      .get();
    if (!duplicateSubdomain.empty || !duplicatePendingSubdomain.empty) {
      throw new Error('El subdominio solicitado ya está en uso.');
    }
  }

  const ts = admin.firestore.FieldValue.serverTimestamp();
  const tenantRef = db.collection('tenants').doc();
  const tenantPayload: Record<string, unknown> = {
    name: role === 'dealer' ? businessName : name,
    businessName,
    displayName: businessName || name,
    companyName: role === 'dealer' ? businessName : undefined,
    type: role,
    status: 'pending_payment',
    phone: phone || null,
    contactPhone: contactPhone || phone || null,
    contactEmail: contactEmail || email || null,
    whatsapp: whatsapp || null,
    taxId: taxId || null,
    address: address || null,
    city: city || null,
    state: state || null,
    postalCode: postalCode || null,
    country: country || null,
    website: website || null,
    ...(subdomain ? { pendingSubdomain: subdomain } : {}),
    createdByAdminId: params.adminUserId,
    activationStatus: 'pending_stripe_payment',
    createdAt: ts,
    updatedAt: ts,
  };
  Object.keys(tenantPayload).forEach((key) => {
    if (tenantPayload[key] === undefined) delete tenantPayload[key];
  });
  await tenantRef.set(tenantPayload);

  const user = await createUser(
    email,
    password,
    name,
    role,
    tenantRef.id,
    undefined,
    String(params.membership.id || '')
  );

  await db.collection('users').doc(user.id).update({
    createdByAdmin: true,
    adminCreatorUserId: params.adminUserId,
    mustChangePassword: true,
    status: 'pending_payment',
    activationStatus: 'pending_stripe_payment',
    adminMembershipAccess: 'required',
    adminMembershipSelectionRequired: true,
    phone: phone || admin.firestore.FieldValue.delete(),
    whatsapp: whatsapp || admin.firestore.FieldValue.delete(),
    businessName: businessName || admin.firestore.FieldValue.delete(),
    contactPhone: contactPhone || admin.firestore.FieldValue.delete(),
    contactEmail: contactEmail || admin.firestore.FieldValue.delete(),
    taxId: taxId || admin.firestore.FieldValue.delete(),
    address: address || admin.firestore.FieldValue.delete(),
    city: city || admin.firestore.FieldValue.delete(),
    state: state || admin.firestore.FieldValue.delete(),
    postalCode: postalCode || admin.firestore.FieldValue.delete(),
    country: country || admin.firestore.FieldValue.delete(),
    website: website || admin.firestore.FieldValue.delete(),
    platformTermsAcceptedAt: ts,
    updatedAt: ts,
  });
  await tenantRef.update({ ownerId: user.id, updatedAt: ts });
  await finalizeUserRegistration(user.id);

  return { userId: user.id, tenantId: tenantRef.id, email, name, role };
}

async function ensureStripeCustomer(userId: string, user: Record<string, unknown>): Promise<string> {
  const existing = typeof user.stripeCustomerId === 'string' ? user.stripeCustomerId.trim() : '';
  if (existing) return existing;

  const { getStripeInstance } = await import('@autodealers/core');
  const stripe = await getStripeInstance();
  const email = typeof user.email === 'string' ? user.email : undefined;
  const name =
    typeof user.displayName === 'string'
      ? user.displayName
      : typeof user.name === 'string'
        ? user.name
        : undefined;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
      tenantId: typeof user.tenantId === 'string' ? user.tenantId : '',
      managedBy: 'autodealers',
    },
  });

  await db.collection('users').doc(userId).update({
    stripeCustomerId: customer.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return customer.id;
}

async function resolveDefaultPaymentMethod(customerId: string): Promise<string | undefined> {
  const { getStripeInstance } = await import('@autodealers/core');
  const stripe = await getStripeInstance();
  const customer = await stripe.customers.retrieve(customerId);
  if ('deleted' in customer && customer.deleted) return undefined;

  const invoiceSettings = (customer as any).invoice_settings;
  const defaultMethod = invoiceSettings?.default_payment_method;
  if (typeof defaultMethod === 'string' && defaultMethod.trim()) return defaultMethod;
  if (defaultMethod?.id) return defaultMethod.id;

  const cards = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  if (cards.data[0]?.id) return cards.data[0].id;

  const banks = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'us_bank_account',
    limit: 1,
  });
  return banks.data[0]?.id;
}

async function createOrUpdateStripeSubscription(params: {
  userId: string;
  tenantId: string;
  membershipId: string;
  stripePriceId: string;
  billingCycle: string;
  customerId: string;
}): Promise<{
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  period: ReturnType<typeof subscriptionDates>;
  hostedInvoiceUrl?: string;
  paymentIntentClientSecret?: string;
}> {
  const stripe = await getStripeInstance();
  const subs = await listSubscriptionsForTenant(params.tenantId);
  const existingStripe = subs.find(
    (s) => isActiveStatus(String(s.status)) && typeof s.stripeSubscriptionId === 'string' && s.stripeSubscriptionId.trim()
  );
  const defaultPaymentMethod = await resolveDefaultPaymentMethod(params.customerId);
  let stripeSub: any;

  if (existingStripe) {
    const current = await stripe.subscriptions.retrieve(String(existingStripe.stripeSubscriptionId));
    const itemId = current.items.data[0]?.id;
    if (!itemId) throw new Error('La suscripción Stripe no tiene line item.');
    stripeSub = await stripe.subscriptions.update(String(existingStripe.stripeSubscriptionId), {
      items: [{ id: itemId, price: params.stripePriceId }],
      proration_behavior: 'create_prorations',
      ...(defaultPaymentMethod ? { default_payment_method: defaultPaymentMethod } : {}),
      metadata: {
        ...current.metadata,
        tenantId: params.tenantId,
        userId: params.userId,
        membershipId: params.membershipId,
        customMembership: 'true',
        assignedByAdmin: 'true',
      },
      expand: ['latest_invoice.payment_intent'],
    } as any);
  } else {
    stripeSub = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card', 'us_bank_account'],
        save_default_payment_method: 'on_subscription',
      },
      ...(defaultPaymentMethod ? { default_payment_method: defaultPaymentMethod } : {}),
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tenantId: params.tenantId,
        userId: params.userId,
        membershipId: params.membershipId,
        customMembership: 'true',
        assignedByAdmin: 'true',
      },
    } as any);
  }

  const period = subscriptionDates(stripeSub, params.billingCycle);
  const latestInvoice = stripeSub.latest_invoice;
  const hostedInvoiceUrl =
    typeof latestInvoice?.hosted_invoice_url === 'string'
      ? latestInvoice.hosted_invoice_url
      : undefined;
  const paymentIntentClientSecret =
    typeof latestInvoice?.payment_intent?.client_secret === 'string'
      ? latestInvoice.payment_intent.client_secret
      : undefined;
  return {
    stripeSubscriptionId: stripeSub.id,
    stripeCustomerId: params.customerId,
    status: period.status,
    period,
    hostedInvoiceUrl,
    paymentIntentClientSecret,
  };
}

async function createStripeCustomerPortalUrl(customerId: string, role: string): Promise<string | undefined> {
  try {
    const stripe = await getStripeInstance();
    const returnUrl = role === 'dealer' ? `${resolveDealerUrl()}/login` : `${resolveSellerUrl()}/login`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url || undefined;
  } catch (error) {
    console.warn('No se pudo crear portal Stripe para membresía custom:', error);
    return undefined;
  }
}

async function sendCustomMembershipPaymentEmail(params: {
  tenantId: string;
  to: string;
  name: string;
  role: string;
  membershipName: string;
  paymentUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const portalName = params.role === 'dealer' ? 'Dealer' : 'Seller';
  const loginUrl = params.role === 'dealer' ? resolveDealerUrl() : resolveSellerUrl();
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Completa tu membresía en AutoDealersOnline</h2>
      <p>Hola ${params.name || ''},</p>
      <p>Tu cuenta fue creada por el equipo de soporte con la membresía <strong>${params.membershipName}</strong>.</p>
      <p>Para activar la cuenta debes completar la configuración de pago directamente en Stripe. La cuenta permanecerá pendiente hasta que Stripe confirme el pago/método de pago.</p>
      <p>
        <a href="${params.paymentUrl}" style="display:inline-block;background:#E10600;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
          Configurar pago en Stripe
        </a>
      </p>
      <p>Después de que Stripe confirme, podrás entrar al portal ${portalName}: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>Si no solicitaste esta cuenta, puedes ignorar este mensaje o contactar soporte.</p>
    </div>
  `;
  const result = await sendOutboundEmail(
    params.to,
    'Completa tu membresía AutoDealersOnline en Stripe',
    html,
    params.tenantId
  );
  return { sent: result.success, error: result.error };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('membershipId');
    let query: admin.firestore.Query = db.collection('custom_membership_assignments');
    if (membershipId) query = query.where('membershipId', '==', membershipId);

    let snap;
    try {
      snap = await query.orderBy('assignedAt', 'desc').limit(200).get();
    } catch {
      snap = await query.limit(200).get();
    }

    const assignments = await Promise.all(
      snap.docs.map(async (doc) => {
        const row = serializeFirestoreDoc(doc);
        const userId = typeof row.userId === 'string' ? row.userId : '';
        const tenantId = typeof row.tenantId === 'string' ? row.tenantId : '';
        const membershipId = typeof row.membershipId === 'string' ? row.membershipId : '';
        let user: Record<string, unknown> | null = null;
        let tenant: Record<string, unknown> | null = null;
        let membership: Record<string, unknown> | null = null;
        if (userId) {
          const userSnap = await db.collection('users').doc(userId).get();
          user = userSnap.exists ? serializeFirestoreDoc(userSnap) : null;
        }
        if (tenantId) {
          const tenantSnap = await db.collection('tenants').doc(tenantId).get();
          tenant = tenantSnap.exists ? serializeFirestoreDoc(tenantSnap) : null;
        }
        if (membershipId) {
          const membershipSnap = await db.collection('memberships').doc(membershipId).get();
          membership = membershipSnap.exists ? serializeFirestoreDoc(membershipSnap) : null;
        }
        return {
          ...row,
          userName: user?.displayName || user?.name || user?.email || userId,
          userEmail: user?.email || null,
          userRole: user?.role || null,
          tenantName: tenant?.businessName || tenant?.name || tenant?.displayName || tenantId,
          membershipName: membership?.name || (row.membershipSnapshot as Record<string, unknown> | undefined)?.name || membershipId,
          planKind: membership ? customPlanKind(membership) : undefined,
        };
      })
    );

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('custom membership assignments GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let userId = String(body.userId || '').trim();
    let provisionedAccount: { email: string; name: string; role: 'seller' | 'dealer' } | null = null;
    const membershipId = String(body.membershipId || '').trim();
    if (!membershipId) {
      return NextResponse.json({ error: 'Membresía requerida.' }, { status: 400 });
    }

    const membershipSnap = await db.collection('memberships').doc(membershipId).get();
    if (!membershipSnap.exists) {
      return NextResponse.json({ error: 'Membresía custom no encontrada' }, { status: 404 });
    }

    const membership = { id: membershipSnap.id, ...(membershipSnap.data() || {}) };
    const features = membership.features as Record<string, unknown> | undefined;
    if (features?.adminAssignOnly !== true && features?.customMembership !== true) {
      return NextResponse.json(
        { error: 'Solo se pueden asignar membresías custom desde esta ruta.' },
        { status: 400 }
      );
    }
    if (membership.isActive === false || membership.status === 'inactive') {
      return NextResponse.json({ error: 'La membresía custom está inactiva.' }, { status: 400 });
    }
    const planKind = customPlanKind(membership);

    if (!userId) {
      const newAccount =
        body.newAccount && typeof body.newAccount === 'object'
          ? (body.newAccount as Record<string, unknown>)
          : null;
      if (!newAccount) {
        return NextResponse.json(
          { error: 'Selecciona un usuario existente o crea una cuenta nueva.' },
          { status: 400 }
        );
      }
      if (planKind === 'seller' && body.dealerId) {
        newAccount.dealerId = body.dealerId;
      }
      const provisioned = await provisionAccountForCustomMembership({
        membership,
        account: newAccount,
        adminUserId: auth.userId,
      });
      userId = provisioned.userId;
      provisionedAccount = {
        email: provisioned.email,
        name: provisioned.name,
        role: provisioned.role,
      };
    }

    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    const user = userSnap.data() || {};

    const role = String(user.role || '');
    if (role !== 'dealer' && role !== 'seller') {
      return NextResponse.json(
        { error: 'Solo se puede asignar a seller, dealer o multi-dealer.' },
        { status: 400 }
      );
    }

    const expectedType = role === 'dealer' ? 'dealer' : 'seller';
    if (membership.type !== expectedType) {
      return NextResponse.json(
        { error: `La membresía debe ser de tipo ${expectedType}.` },
        { status: 400 }
      );
    }
    if (planKind === 'multi_dealer' && role !== 'dealer') {
      return NextResponse.json(
        { error: 'Las membresías Multi Dealer solo pueden asignarse a usuarios dealer.' },
        { status: 400 }
      );
    }

    const tenantId = typeof user.tenantId === 'string' ? user.tenantId.trim() : '';
    if (!tenantId) return NextResponse.json({ error: 'El usuario no tiene tenantId.' }, { status: 400 });

    const dealerIdForSeller = String(body.dealerId || user.dealerId || '').trim();

    const stripePriceId = typeof membership.stripePriceId === 'string' ? membership.stripePriceId.trim() : '';
    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'La membresía custom no tiene Stripe Price ID.' },
        { status: 400 }
      );
    }

    const customerId = await ensureStripeCustomer(userId, user);
    const stripeResult = await createOrUpdateStripeSubscription({
      userId,
      tenantId,
      membershipId,
      stripePriceId,
      billingCycle: String(membership.billingCycle || 'monthly'),
      customerId,
    });
    const paymentUrl =
      stripeResult.hostedInvoiceUrl ||
      (!isActiveStatus(stripeResult.status)
        ? await createStripeCustomerPortalUrl(stripeResult.stripeCustomerId, role)
        : undefined);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const assignmentRef = db.collection('custom_membership_assignments').doc();
    const assignmentStatus = isActiveStatus(stripeResult.status) ? 'active' : 'pending_payment';

    await assignmentRef.set({
      id: assignmentRef.id,
      membershipId,
      userId,
      tenantId,
      assignedByAdminId: auth.userId,
      assignedAt: now,
      status: assignmentStatus,
      stripeCustomerId: stripeResult.stripeCustomerId,
      stripeSubscriptionId: stripeResult.stripeSubscriptionId,
      paymentUrl: paymentUrl || null,
      membershipSnapshot: serializeFirestoreDoc(membershipSnap),
      planKind,
      updatedAt: now,
    });

    try {
      const stripe = await getStripeInstance();
      const currentStripeSub = await stripe.subscriptions.retrieve(stripeResult.stripeSubscriptionId);
      await stripe.subscriptions.update(stripeResult.stripeSubscriptionId, {
        metadata: {
          ...currentStripeSub.metadata,
          tenantId,
          userId,
          membershipId,
          customMembership: 'true',
          assignedByAdmin: 'true',
          customMembershipAssignmentId: assignmentRef.id,
        },
      });
    } catch (metadataError) {
      console.warn('No se pudo actualizar metadata Stripe de membresía custom:', metadataError);
    }

    const dealerNetworkId = await ensureDealerNetworkForAssignment({
      userId,
      tenantId,
      membershipId,
      assignmentId: assignmentRef.id,
      membership,
      assignedByAdminId: auth.userId,
    });

    if (dealerNetworkId) {
      await assignmentRef.update({
        dealerNetworkId,
        updatedAt: now,
      });
    }

    const subs = await listSubscriptionsForTenant(tenantId);
    const latestMatchingSub = await db
      .collection('subscriptions')
      .where('stripeSubscriptionId', '==', stripeResult.stripeSubscriptionId)
      .limit(1)
      .get();
    const existingDoc = !latestMatchingSub.empty
      ? { id: latestMatchingSub.docs[0].id, ...latestMatchingSub.docs[0].data() }
      : subs.find((s) => s.stripeSubscriptionId === stripeResult.stripeSubscriptionId);
    const subscriptionPayload = {
      tenantId,
      userId,
      membershipId,
      billingSource: 'stripe',
      customMembershipAssignmentId: assignmentRef.id,
      ...(dealerNetworkId ? { dealerNetworkId } : {}),
      stripeSubscriptionId: stripeResult.stripeSubscriptionId,
      stripeCustomerId: stripeResult.stripeCustomerId,
      status: stripeResult.status,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(stripeResult.period.currentPeriodStart),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(stripeResult.period.currentPeriodEnd),
      ...(stripeResult.period.trialEndsAt
        ? { trialEndsAt: admin.firestore.Timestamp.fromDate(stripeResult.period.trialEndsAt) }
        : {}),
      ...(stripeResult.period.nextPaymentDate
        ? { nextPaymentDate: admin.firestore.Timestamp.fromDate(stripeResult.period.nextPaymentDate) }
        : {}),
      cancelAtPeriodEnd: false,
      updatedAt: now,
    };

    if (existingDoc?.id) {
      await db.collection('subscriptions').doc(existingDoc.id).update(subscriptionPayload);
    } else {
      const subRef = db.collection('subscriptions').doc();
      await subRef.set({
        id: subRef.id,
        createdAt: now,
        ...subscriptionPayload,
      });
    }

    const oldAdminGrants = subs.filter(
      (s) => s.billingSource === 'admin_grant' && isActiveStatus(String(s.status))
    );
    for (const grant of oldAdminGrants) {
      await db.collection('subscriptions').doc(String(grant.id)).update({
        status: 'cancelled',
        cancelledAt: now,
        adminRevokedBy: auth.userId,
        adminRevokedAt: now,
        updatedAt: now,
      });
    }

    await db.collection('users').doc(userId).update({
      adminMembershipAccess: isActiveStatus(stripeResult.status) ? 'granted' : 'required',
      adminMembershipSelectionRequired: !isActiveStatus(stripeResult.status),
      customMembershipAssignmentId: assignmentRef.id,
      ...(dealerNetworkId ? { dealerNetworkId } : {}),
      ...(planKind === 'seller' ? { billingMode: 'self_service' } : {}),
      membershipId: isActiveStatus(stripeResult.status) ? membershipId : admin.firestore.FieldValue.delete(),
      updatedAt: now,
    });

    if (isActiveStatus(stripeResult.status)) {
      await applyMembershipToTenantAndUsers(tenantId, membershipId);
    }

    if (planKind === 'seller' && dealerIdForSeller) {
      const currentDealerId = typeof user.dealerId === 'string' ? user.dealerId.trim() : '';
      const dealerOwnerUserId = await resolveDealerOwnerUserId(dealerIdForSeller);
      if (!dealerOwnerUserId) {
        return NextResponse.json(
          { error: 'El dealer seleccionado no tiene dueño/admin asociado.' },
          { status: 400 }
        );
      }
      if (currentDealerId && currentDealerId !== dealerIdForSeller) {
        await transferSellerToDealer({
          sellerUserId: userId,
          fromDealerTenantId: currentDealerId,
          toDealerTenantId: dealerIdForSeller,
          toDealerUserId: dealerOwnerUserId,
          transferredByUserId: auth.userId,
          inheritDealerMembership: false,
        });
      } else if (!currentDealerId) {
        await assignSellerToDealerDirect({
          dealerTenantId: dealerIdForSeller,
          dealerUserId: dealerOwnerUserId,
          sellerUserId: userId,
          assignedByUserId: auth.userId,
          source: 'admin_direct',
          inheritDealerMembership: false,
        });
      }
    }

    await db.collection('custom_membership_audit').add({
      action: 'assigned',
      membershipId,
      assignmentId: assignmentRef.id,
      userId,
      tenantId,
      adminUserId: auth.userId,
      status: assignmentStatus,
      stripeSubscriptionId: stripeResult.stripeSubscriptionId,
      paymentUrl: paymentUrl || null,
      createdAt: now,
    });

    let paymentEmailSent = false;
    let paymentEmailError: string | undefined;
    if (!isActiveStatus(stripeResult.status) && paymentUrl) {
      const targetEmail =
        provisionedAccount?.email ||
        (typeof user.email === 'string' ? user.email : '') ||
        (typeof user.contactEmail === 'string' ? user.contactEmail : '');
      if (targetEmail) {
        const emailResult = await sendCustomMembershipPaymentEmail({
          tenantId,
          to: targetEmail,
          name: provisionedAccount?.name || String(user.name || user.displayName || ''),
          role,
          membershipName: String(membership.name || 'Membresía custom'),
          paymentUrl,
        });
        paymentEmailSent = emailResult.sent;
        paymentEmailError = emailResult.error;
        await assignmentRef.set(
          {
            paymentEmailSent,
            paymentEmailError: paymentEmailError || null,
            paymentEmailSentAt: paymentEmailSent ? now : null,
            updatedAt: now,
          },
          { merge: true }
        );
      }
    }

    const assignment = await assignmentRef.get();
    return NextResponse.json({
      success: true,
      status: assignmentStatus,
      stripeSubscriptionStatus: stripeResult.status,
      setupRequired: !isActiveStatus(stripeResult.status),
      paymentUrl: paymentUrl || null,
      paymentEmailSent,
      paymentEmailError: paymentEmailError || null,
      paymentIntentClientSecret: stripeResult.paymentIntentClientSecret || null,
      assignment: serializeFirestoreDoc(assignment),
    });
  } catch (error) {
    console.error('custom membership assignment POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const assignmentId = String(body.assignmentId || '').trim();
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId requerido.' }, { status: 400 });
    }

    const ref = db.collection('custom_membership_assignments').doc(assignmentId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 });
    }

    const assignment = snap.data() || {};
    const userId = String(assignment.userId || '').trim();
    const tenantId = String(assignment.tenantId || '').trim();
    const membershipId = String(assignment.membershipId || '').trim();
    const stripeSubscriptionId = String(assignment.stripeSubscriptionId || '').trim();
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (body.cancelStripe !== false && stripeSubscriptionId) {
      try {
        const stripe = await getStripeInstance();
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (sub.status !== 'canceled') {
          await stripe.subscriptions.cancel(stripeSubscriptionId);
        }
      } catch (stripeError) {
        console.warn('No se pudo cancelar Stripe subscription custom:', stripeError);
      }
    }

    await ref.update({
      status: 'cancelled',
      cancelledByAdminId: auth.userId,
      cancelledAt: now,
      updatedAt: now,
    });

    const subSnap = stripeSubscriptionId
      ? await db
          .collection('subscriptions')
          .where('stripeSubscriptionId', '==', stripeSubscriptionId)
          .limit(1)
          .get()
      : null;
    if (subSnap && !subSnap.empty) {
      await subSnap.docs[0].ref.set(
        {
          status: 'cancelled',
          cancelledAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    if (body.revokeAccess !== false && userId) {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      const userMembershipId = String(userSnap.data()?.membershipId || '').trim();
      await userRef.set(
        {
          adminMembershipAccess: 'required',
          adminMembershipSelectionRequired: true,
          updatedAt: now,
          ...(userMembershipId === membershipId ? { membershipId: admin.firestore.FieldValue.delete() } : {}),
        },
        { merge: true }
      );
      if (tenantId) {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        const tenantMembershipId = String(tenantSnap.data()?.membershipId || '').trim();
        if (tenantMembershipId === membershipId) {
          await db.collection('tenants').doc(tenantId).set(
            {
              membershipId: admin.firestore.FieldValue.delete(),
              updatedAt: now,
            },
            { merge: true }
          );
        }
      }
    }

    await db.collection('custom_membership_audit').add({
      action: 'cancelled',
      assignmentId,
      membershipId,
      userId,
      tenantId,
      adminUserId: auth.userId,
      stripeSubscriptionId,
      createdAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('custom membership assignments DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
