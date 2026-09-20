// Estado e idempotencia del webhook admin + Connect para panel admin

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import {
  getStripePublishableKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isValidStripeWebhookSecret,
} from './credentials';
import { getStripeInstance } from './stripe-helper';
import { listAffiliateCommissions, listAffiliatePartners } from './affiliates';

export const ADMIN_STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.expired',
  'payment_intent.succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.paid',
  'account.updated',
  'transfer.reversed',
] as const;

export type StripeMode = 'test' | 'live';

export function resolveStripeMode(secretKey?: string | null): StripeMode {
  return secretKey?.startsWith('sk_live') ? 'live' : 'test';
}

export interface StripeCredentialsValidation {
  valid: boolean;
  mode?: StripeMode;
  error?: string;
  accountId?: string;
  accountName?: string | null;
  chargesEnabled?: boolean;
  connectTransfersEnabled?: boolean;
}

export interface StripeAdminSetupResult {
  validation: StripeCredentialsValidation;
  webhook: EnsureWebhookResult;
  status: StripeInfrastructureStatus;
  message: string;
  webhookSecretAutoConfigured: boolean;
}

function normalizeStripeKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, '').trim();
}

export function validateStripeSecretKey(secretKey: unknown): StripeCredentialsValidation {
  const key = normalizeStripeKey(secretKey);
  if (!key) {
    return { valid: false, error: 'La Secret Key de Stripe es obligatoria (sk_test_... o sk_live_...).' };
  }
  if (key.startsWith('••••')) {
    return { valid: false, error: 'Introduce la Secret Key completa, no el valor enmascarado.' };
  }
  if (!/^sk_(test|live)_/.test(key)) {
    return { valid: false, error: 'Secret Key inválida. Debe empezar por sk_test_ o sk_live_.' };
  }
  return { valid: true, mode: resolveStripeMode(key) };
}

export function validateStripePublishableKey(
  publishableKey: unknown,
  expectedMode?: StripeMode
): StripeCredentialsValidation {
  const key = normalizeStripeKey(publishableKey);
  if (!key) {
    return { valid: false, error: 'La Publishable Key es obligatoria (pk_test_... o pk_live_...).' };
  }
  if (key.startsWith('••••')) {
    return { valid: false, error: 'Introduce la Publishable Key completa, no el valor enmascarado.' };
  }
  if (!/^pk_(test|live)_/.test(key)) {
    return { valid: false, error: 'Publishable Key inválida. Debe empezar por pk_test_ o pk_live_.' };
  }
  const mode: StripeMode = key.startsWith('pk_live') ? 'live' : 'test';
  if (expectedMode && mode !== expectedMode) {
    return {
      valid: false,
      mode,
      error: `La Publishable Key es modo ${mode.toUpperCase()} pero la Secret Key es ${expectedMode.toUpperCase()}. Deben coincidir.`,
    };
  }
  return { valid: true, mode };
}

export async function validateStripeCredentialsPair(
  secretKey: unknown,
  publishableKey: unknown
): Promise<StripeCredentialsValidation> {
  const sk = validateStripeSecretKey(secretKey);
  if (!sk.valid || !sk.mode) {
    return sk;
  }

  const pk = validateStripePublishableKey(publishableKey, sk.mode);
  if (!pk.valid) {
    return pk;
  }

  try {
    const stripe = new Stripe(normalizeStripeKey(secretKey), { apiVersion: '2023-10-16' });
    const account = await stripe.accounts.retrieve();
    return {
      valid: true,
      mode: sk.mode,
      accountId: account.id,
      accountName:
        account.settings?.dashboard?.display_name ||
        (account.business_profile?.name as string | undefined) ||
        null,
      chargesEnabled: Boolean(account.charges_enabled),
      connectTransfersEnabled: account.capabilities?.transfers === 'active',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con Stripe';
    return { valid: false, error: message, mode: sk.mode };
  }
}

export function resolveStripeCredentialInput(
  incoming: unknown,
  stored: unknown
): string | undefined {
  const fromIncoming = normalizeStripeKey(incoming);
  if (fromIncoming && !fromIncoming.startsWith('••••')) {
    return fromIncoming;
  }
  const fromStored = normalizeStripeKey(stored);
  return fromStored || undefined;
}

export interface StripeWebhookEndpointSummary {
  id: string;
  url: string;
  status: string;
  enabledEvents: string[];
  connect: boolean;
  missingEvents: string[];
  extraEvents: string[];
  matchesTarget: boolean;
}

export interface StripeInfrastructureStatus {
  mode: StripeMode;
  accountId: string;
  accountName: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  connectTransfersEnabled: boolean;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  webhookEndpoints: StripeWebhookEndpointSummary[];
  webhookReady: boolean;
  balance: {
    available: number;
    pending: number;
    connectReserved: number;
    currency: string;
  };
  affiliates: {
    total: number;
    connectReady: number;
    connectPending: number;
    withoutConnect: number;
    pendingCommissionAmount: number;
    deferredCommissionAmount: number;
    failedCommissionCount: number;
    paidCommissionAmount: number;
  };
  recentAffiliateTransfers: Array<{
    id: string;
    amount: number;
    currency: string;
    created: string;
    destination: string | null;
    commissionId: string | null;
    affiliateId: string | null;
    reversed: boolean;
  }>;
  nextAffiliatePayoutHint: string;
}

function summarizeWebhookEndpoint(
  endpoint: {
    id: string;
    url: string;
    status: string;
    enabled_events: string[];
    application?: string | null;
  },
  targetUrl: string
): StripeWebhookEndpointSummary {
  const required = new Set<string>(ADMIN_STRIPE_WEBHOOK_EVENTS);
  const enabled = new Set(endpoint.enabled_events || []);
  const missingEvents = [...required].filter((e) => !enabled.has(e));
  const extraEvents = [...enabled].filter((e) => !required.has(e as (typeof ADMIN_STRIPE_WEBHOOK_EVENTS)[number]));
  return {
    id: endpoint.id,
    url: endpoint.url,
    status: endpoint.status,
    enabledEvents: endpoint.enabled_events || [],
    connect: Boolean(endpoint.application),
    missingEvents,
    extraEvents,
    matchesTarget: endpoint.url === targetUrl,
  };
}

export async function getStripeInfrastructureStatus(
  webhookUrl: string
): Promise<StripeInfrastructureStatus> {
  const stripe = await getStripeInstance();
  const secretKey = await getStripeSecretKey();
  const webhookSecret = await getStripeWebhookSecret();
  const mode = resolveStripeMode(secretKey);

  const [account, balance, webhooks, affiliates, commissions] = await Promise.all([
    stripe.accounts.retrieve(),
    stripe.balance.retrieve(),
    stripe.webhookEndpoints.list({ limit: 30 }),
    listAffiliatePartners(),
    listAffiliateCommissions({ limit: 300 }),
  ]);

  const webhookEndpoints = webhooks.data.map((w) => summarizeWebhookEndpoint(w, webhookUrl));
  const targetEndpoint = webhookEndpoints.find((w) => w.matchesTarget);
  const webhookReady = Boolean(
    targetEndpoint &&
      targetEndpoint.status === 'enabled' &&
      targetEndpoint.missingEvents.length === 0 &&
      isValidStripeWebhookSecret(webhookSecret)
  );

  const available = balance.available[0];
  const pending = balance.pending[0];
  const connectReserved = balance.connect_reserved?.[0];

  let pendingCommissionAmount = 0;
  let deferredCommissionAmount = 0;
  let failedCommissionCount = 0;
  let paidCommissionAmount = 0;

  for (const c of commissions) {
    if (c.status === 'paid') paidCommissionAmount += c.amount;
    if (c.status === 'approved') {
      if (c.payoutStatus === 'deferred') deferredCommissionAmount += c.amount;
      else if (c.payoutStatus === 'failed') failedCommissionCount++;
      else pendingCommissionAmount += c.amount;
    }
  }

  const connectReady = affiliates.filter((a) => a.stripeConnectPayoutsEnabled).length;
  const connectPending = affiliates.filter(
    (a) => a.stripeConnectAccountId && !a.stripeConnectPayoutsEnabled
  ).length;
  const withoutConnect = affiliates.filter((a) => !a.stripeConnectAccountId).length;

  const transfers = await stripe.transfers.list({ limit: 50 });
  const recentAffiliateTransfers = transfers.data
    .filter((t) => t.metadata?.affiliateId || t.metadata?.commissionId)
    .slice(0, 15)
    .map((t) => ({
      id: t.id,
      amount: t.amount / 100,
      currency: t.currency.toUpperCase(),
      created: new Date(t.created * 1000).toISOString(),
      destination: typeof t.destination === 'string' ? t.destination : null,
      commissionId: t.metadata?.commissionId || null,
      affiliateId: t.metadata?.affiliateId || null,
      reversed: Boolean(t.reversed),
    }));

  return {
    mode,
    accountId: account.id,
    accountName:
      account.settings?.dashboard?.display_name ||
      (account.business_profile?.name as string | undefined) ||
      null,
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    connectTransfersEnabled: account.capabilities?.transfers === 'active',
    webhookUrl,
    webhookSecretConfigured: isValidStripeWebhookSecret(webhookSecret),
    webhookEndpoints,
    webhookReady,
    balance: {
      available: (available?.amount ?? 0) / 100,
      pending: (pending?.amount ?? 0) / 100,
      connectReserved: (connectReserved?.amount ?? 0) / 100,
      currency: (available?.currency || pending?.currency || 'usd').toUpperCase(),
    },
    affiliates: {
      total: affiliates.length,
      connectReady,
      connectPending,
      withoutConnect,
      pendingCommissionAmount,
      deferredCommissionAmount,
      failedCommissionCount,
      paidCommissionAmount,
    },
    recentAffiliateTransfers,
    nextAffiliatePayoutHint: 'Lunes 10:00 AM (America/Puerto_Rico)',
  };
}

export interface EnsureWebhookResult {
  endpointId: string;
  created: boolean;
  updated: boolean;
  webhookSecret?: string;
  enabledEvents: string[];
}

export async function ensureAdminStripeWebhook(
  webhookUrl: string,
  options?: { forceRecreate?: boolean }
): Promise<EnsureWebhookResult> {
  const stripe = await getStripeInstance();
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  let existing = endpoints.data.find((e) => e.url === webhookUrl);
  const requiredEvents = [...ADMIN_STRIPE_WEBHOOK_EVENTS];
  const forceRecreate = Boolean(options?.forceRecreate);

  if (existing && forceRecreate) {
    await stripe.webhookEndpoints.del(existing.id);
    existing = undefined;
  }

  if (existing) {
    const missing = requiredEvents.filter((e) => !existing!.enabled_events.includes(e));
    const needsUpdate = missing.length > 0 || existing.status !== 'enabled';

    if (!needsUpdate && !forceRecreate) {
      return {
        endpointId: existing.id,
        created: false,
        updated: false,
        enabledEvents: existing.enabled_events,
      };
    }

    const updated = await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: requiredEvents,
      disabled: false,
      description: 'AutoDealers admin - membresias y afiliados Connect',
    });

    return {
      endpointId: updated.id,
      created: false,
      updated: true,
      enabledEvents: updated.enabled_events,
    };
  }

  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: requiredEvents,
    connect: true,
    description: 'AutoDealers admin - membresias y afiliados Connect',
  });

  return {
    endpointId: created.id,
    created: true,
    updated: false,
    webhookSecret: created.secret || undefined,
    enabledEvents: created.enabled_events,
  };
}

export async function completeStripeAdminSetup(
  webhookUrl: string,
  updatedBy: string
): Promise<StripeAdminSetupResult> {
  const [secretKey, publishableKey, webhookSecret] = await Promise.all([
    getStripeSecretKey(),
    getStripePublishableKey(),
    getStripeWebhookSecret(),
  ]);

  const validation = await validateStripeCredentialsPair(secretKey, publishableKey);
  if (!validation.valid) {
    throw new Error(validation.error || 'Credenciales Stripe inválidas');
  }

  const needsWebhookSecret = !isValidStripeWebhookSecret(webhookSecret);
  const webhook = await ensureAdminStripeWebhook(webhookUrl, {
    forceRecreate: needsWebhookSecret,
  });

  let webhookSecretAutoConfigured = false;
  if (webhook.webhookSecret) {
    await persistStripeWebhookSecret(webhook.webhookSecret, updatedBy);
    webhookSecretAutoConfigured = true;
  }

  const status = await getStripeInfrastructureStatus(webhookUrl);

  let message = 'Stripe configurado correctamente';
  if (webhook.created) {
    message = 'Claves validadas, webhook creado y secreto guardado automáticamente';
  } else if (webhook.updated) {
    message = 'Claves validadas y webhook actualizado con todos los eventos';
  } else if (webhookSecretAutoConfigured) {
    message = 'Claves validadas y webhook secret regenerado automáticamente';
  } else if (status.webhookReady) {
    message = 'Claves validadas. Stripe y webhook listos';
  } else if (needsWebhookSecret) {
    message =
      'Claves validadas, pero no se pudo obtener un webhook secret nuevo. Pulsa Sincronizar webhook.';
  }

  return {
    validation,
    webhook,
    status,
    message,
    webhookSecretAutoConfigured,
  };
}

export async function persistStripeWebhookSecret(
  webhookSecret: string,
  updatedBy: string
): Promise<void> {
  const db = getFirestore();
  await db.collection('system_settings').doc('credentials').set(
    {
      stripeWebhookSecret: webhookSecret,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
}

export async function getAffiliateCommissionStripeDetails(commissionId: string): Promise<{
  commission: Record<string, unknown> | null;
  transfer: Record<string, unknown> | null;
  connectAccount: Record<string, unknown> | null;
}> {
  const db = getFirestore();
  const snap = await db.collection('affiliate_commissions').doc(commissionId).get();
  if (!snap.exists) {
    return { commission: null, transfer: null, connectAccount: null };
  }

  const commission = { id: snap.id, ...snap.data() };
  const stripe = await getStripeInstance();
  let transfer: Record<string, unknown> | null = null;
  let connectAccount: Record<string, unknown> | null = null;

  const transferId = snap.data()?.stripeTransferId;
  if (transferId) {
    try {
      const t = await stripe.transfers.retrieve(String(transferId));
      transfer = {
        id: t.id,
        amount: t.amount / 100,
        currency: t.currency.toUpperCase(),
        created: new Date(t.created * 1000).toISOString(),
        destination: typeof t.destination === 'string' ? t.destination : null,
        reversed: t.reversed,
        metadata: t.metadata,
      };
    } catch {
      transfer = null;
    }
  }

  const affiliateId = snap.data()?.affiliateId;
  if (affiliateId) {
    const affiliateSnap = await db.collection('affiliate_partners').doc(String(affiliateId)).get();
    const connectId = affiliateSnap.data()?.stripeConnectAccountId;
    if (connectId) {
      try {
        const acct = await stripe.accounts.retrieve(String(connectId));
        connectAccount = {
          id: acct.id,
          email: acct.email,
          payoutsEnabled: acct.payouts_enabled,
          detailsSubmitted: acct.details_submitted,
          requirementsDue: acct.requirements?.currently_due || [],
        };
      } catch {
        connectAccount = { id: connectId, error: 'No se pudo leer la cuenta Connect' };
      }
    }
  }

  return { commission, transfer, connectAccount };
}
