// Stripe Connect Express para tenants (dealer/seller) — depósitos de clientes

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getStripeInstance } from './stripe-helper';

function getDb() {
  return getFirestore();
}

export interface TenantConnectStatus {
  accountId: string | null;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
}

export async function getTenantConnectStatus(tenantId: string): Promise<TenantConnectStatus> {
  const doc = await getDb().collection('tenants').doc(tenantId).get();
  const data = doc.data() || {};
  const accountId = data.stripeConnectAccountId || null;
  if (!accountId) {
    return {
      accountId: null,
      onboardingComplete: false,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      requiresAction: true,
    };
  }
  return syncTenantConnectAccountFromStripe(tenantId);
}

export async function syncTenantConnectAccountFromStripe(
  tenantId: string
): Promise<TenantConnectStatus> {
  const doc = await getDb().collection('tenants').doc(tenantId).get();
  const data = doc.data() || {};
  const accountId = data.stripeConnectAccountId as string | undefined;
  if (!accountId) {
    return {
      accountId: null,
      onboardingComplete: false,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      requiresAction: true,
    };
  }

  const stripe = await getStripeInstance();
  const account = await stripe.accounts.retrieve(accountId);
  const onboardingComplete = Boolean(account.details_submitted);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const chargesEnabled = Boolean(account.charges_enabled);

  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .set(
      {
        stripeConnectOnboardingComplete: onboardingComplete,
        stripeConnectPayoutsEnabled: payoutsEnabled,
        stripeConnectChargesEnabled: chargesEnabled,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return {
    accountId,
    onboardingComplete,
    payoutsEnabled,
    chargesEnabled,
    detailsSubmitted: onboardingComplete,
    requiresAction: !payoutsEnabled || !onboardingComplete || !chargesEnabled,
  };
}

export async function ensureTenantConnectAccount(tenantId: string): Promise<string> {
  const doc = await getDb().collection('tenants').doc(tenantId).get();
  if (!doc.exists) throw new Error('Tenant no encontrado');
  const data = doc.data() || {};
  if (data.stripeConnectAccountId) return data.stripeConnectAccountId as string;

  const stripe = await getStripeInstance();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: data.email || data.contactEmail || undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: data.type === 'seller' ? 'individual' : 'company',
    metadata: {
      tenantId,
      platform: 'autodealers',
      purpose: 'deal_deposits',
    },
  });

  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .set(
      {
        stripeConnectAccountId: account.id,
        stripeConnectOnboardingComplete: false,
        stripeConnectPayoutsEnabled: false,
        stripeConnectChargesEnabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return account.id;
}

export async function createTenantConnectOnboardingLink(
  tenantId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<{ url: string; accountId: string }> {
  const accountId = await ensureTenantConnectAccount(tenantId);
  const stripe = await getStripeInstance();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return { url: link.url, accountId };
}

export interface DealDepositCheckoutInput {
  /** Tenant cuya cuenta Connect recibe el dinero */
  tenantId: string;
  /**
   * Tenant donde vive el documento deals/{dealId}.
   * Si no se pasa, se asume igual a tenantId (caso dealer).
   */
  dealTenantId?: string;
  dealId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
  /** Comisión plataforma en centavos (opcional) */
  applicationFeeCents?: number;
  description?: string;
}

/**
 * Checkout de depósito con destination charge hacia la cuenta Connect del tenant.
 */
export async function createDealDepositCheckoutSession(
  input: DealDepositCheckoutInput
): Promise<{ sessionId: string; url: string; paymentIntentId?: string }> {
  const connectTenantId = input.tenantId;
  const dealTenantId = input.dealTenantId || input.tenantId;

  const status = await getTenantConnectStatus(connectTenantId);
  if (!status.accountId || !status.chargesEnabled) {
    throw new Error(
      'Los cobros aún no están activos en la cuenta que recibirá el depósito. Activa cobros o elige otra cuenta.'
    );
  }
  if (!input.amount || input.amount <= 0) {
    throw new Error('El monto del depósito debe ser mayor a 0');
  }

  const stripe = await getStripeInstance();
  const amountCents = Math.round(input.amount * 100);
  const fee =
    input.applicationFeeCents != null
      ? Math.max(0, Math.min(amountCents - 1, Math.floor(input.applicationFeeCents)))
      : 0;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (input.currency || 'usd').toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: input.description || `Depósito / reserva — Deal ${input.dealId}`,
            metadata: {
              tenantId: dealTenantId,
              connectTenantId,
              dealId: input.dealId,
            },
          },
        },
      },
    ],
    payment_intent_data: {
      transfer_data: {
        destination: status.accountId,
      },
      ...(fee > 0 ? { application_fee_amount: fee } : {}),
      metadata: {
        type: 'deal_deposit',
        tenantId: dealTenantId,
        connectTenantId,
        dealId: input.dealId,
        platform: 'autodealers',
      },
    },
    metadata: {
      type: 'deal_deposit',
      tenantId: dealTenantId,
      connectTenantId,
      dealId: input.dealId,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) throw new Error('Stripe no devolvió URL de Checkout');

  return {
    sessionId: session.id,
    url: session.url,
    paymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
  };
}

function isDealerManagedSeller(dealerId?: string | null, billingMode?: string | null): boolean {
  if (billingMode === 'self_service') return false;
  if (billingMode === 'dealer_managed') return true;
  return Boolean(dealerId?.trim());
}

export interface DepositConnectOption {
  tenantId: string;
  label: string;
  ready: boolean;
  kind: 'own' | 'employer_dealer' | 'linked_dealer';
}

export interface DepositConnectContext {
  dealTenantId: string;
  connectTenantId: string;
  mode: 'dealer_own' | 'seller_own' | 'seller_uses_employer_dealer' | 'seller_uses_linked_dealer';
  canSelfOnboard: boolean;
  options: DepositConnectOption[];
  message: string;
}

/**
 * Resuelve dónde vive el deal y a qué cuenta Connect va el depósito.
 */
export async function resolveDepositConnectContext(input: {
  role: string;
  tenantId: string;
  userId: string;
  dealerId?: string | null;
  billingMode?: string | null;
  preferredConnectTenantId?: string | null;
}): Promise<DepositConnectContext> {
  const role = String(input.role || '');
  const ownTenantId = String(input.tenantId || '').trim();
  const dealerId = input.dealerId?.trim() || '';

  const dealerRoles = ['dealer', 'master_dealer', 'dealer_admin', 'manager', 'admin'];
  if (dealerRoles.includes(role)) {
    const st = await getTenantConnectStatus(ownTenantId);
    const ready = Boolean(st.accountId && st.chargesEnabled);
    return {
      dealTenantId: ownTenantId,
      connectTenantId: ownTenantId,
      mode: 'dealer_own',
      canSelfOnboard: true,
      options: [
        {
          tenantId: ownTenantId,
          label: 'Mi concesionario',
          ready,
          kind: 'own',
        },
      ],
      message: ready
        ? 'Los depósitos entran a la cuenta Stripe de tu concesionario.'
        : 'Activa cobros una vez para recibir depósitos de clientes.',
    };
  }

  if (role === 'seller' && isDealerManagedSeller(dealerId, input.billingMode) && dealerId) {
    const st = await getTenantConnectStatus(dealerId);
    const ready = Boolean(st.accountId && st.chargesEnabled);
    let label = 'Concesionario';
    try {
      const doc = await getDb().collection('tenants').doc(dealerId).get();
      label = doc.data()?.name || doc.data()?.businessName || label;
    } catch {
      /* ignore */
    }
    return {
      dealTenantId: dealerId,
      connectTenantId: dealerId,
      mode: 'seller_uses_employer_dealer',
      canSelfOnboard: false,
      options: [
        {
          tenantId: dealerId,
          label: `Dealer: ${label}`,
          ready,
          kind: 'employer_dealer',
        },
      ],
      message: ready
        ? `Los depósitos van a la cuenta Stripe de ${label} (tu dealer).`
        : `Tu dealer (${label}) aún no activó cobros. Pídele que lo active en Deal desk.`,
    };
  }

  const options: DepositConnectOption[] = [];
  const ownSt = await getTenantConnectStatus(ownTenantId);
  options.push({
    tenantId: ownTenantId,
    label: 'Mi cuenta (independiente)',
    ready: Boolean(ownSt.accountId && ownSt.chargesEnabled),
    kind: 'own',
  });

  const linkedIds = new Set<string>();
  if (dealerId) linkedIds.add(dealerId);
  try {
    const userDoc = await getDb().collection('users').doc(input.userId).get();
    const data = userDoc.data() || {};
    const assoc = data.associatedDealers;
    if (Array.isArray(assoc)) {
      for (const id of assoc) {
        if (typeof id === 'string' && id.trim()) linkedIds.add(id.trim());
      }
    }
    const links = await getDb()
      .collection('dealer_seller_links')
      .where('sellerId', '==', input.userId)
      .where('status', '==', 'active')
      .limit(20)
      .get();
    for (const d of links.docs) {
      const dealer = d.data()?.dealerId || d.data()?.dealerTenantId;
      if (typeof dealer === 'string' && dealer.trim()) linkedIds.add(dealer.trim());
    }
  } catch {
    /* ignore */
  }

  for (const id of linkedIds) {
    if (id === ownTenantId) continue;
    const st = await getTenantConnectStatus(id);
    let label = id;
    try {
      const doc = await getDb().collection('tenants').doc(id).get();
      label = doc.data()?.name || doc.data()?.businessName || id;
    } catch {
      /* ignore */
    }
    options.push({
      tenantId: id,
      label: `Dealer: ${label}`,
      ready: Boolean(st.accountId && st.chargesEnabled),
      kind: 'linked_dealer',
    });
  }

  const preferred = input.preferredConnectTenantId?.trim() || '';
  const chosen =
    (preferred && options.find((o) => o.tenantId === preferred)?.tenantId) ||
    options.find((o) => o.kind === 'own')?.tenantId ||
    ownTenantId;

  const chosenOpt = options.find((o) => o.tenantId === chosen);
  const usesLinked = chosenOpt?.kind === 'linked_dealer';

  return {
    dealTenantId: ownTenantId,
    connectTenantId: chosen,
    mode: usesLinked ? 'seller_uses_linked_dealer' : 'seller_own',
    canSelfOnboard: chosen === ownTenantId,
    options,
    message: usesLinked
      ? `Depósito a la cuenta del dealer seleccionado (${chosenOpt?.label}).`
      : chosenOpt?.ready
        ? 'Depósito a tu cuenta Stripe (independiente).'
        : 'Activa cobros en tu cuenta, o elige un dealer vinculado que ya los tenga activos.',
  };
}
