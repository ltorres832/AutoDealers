import { getFirestore } from '@autodealers/shared';
import type * as admin from 'firebase-admin';
import { getSubscriptionByTenantId } from './subscription-management';

type FirestoreDoc = admin.firestore.QueryDocumentSnapshot;

export type PaymentHistoryCategory = 'membership' | 'promotion' | 'banner' | 'featured';
export type PaymentHistoryFilter = 'all' | PaymentHistoryCategory;

export interface TenantPaymentRecord {
  id: string;
  source:
    | 'receipt'
    | 'paid_promotion_request'
    | 'premium_banner'
    | 'featured_promotion_request'
    | 'stripe_invoice';
  category: PaymentHistoryCategory;
  description: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  createdAt?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  invoiceUrl?: string;
  receiptNumber?: string;
}

export interface ListTenantPaymentHistoryOptions {
  /** Tenant for promotions, banners and featured purchases. */
  marketplaceTenantId: string;
  /** Tenant for membership receipts and Stripe subscription invoices. */
  billingTenantId?: string;
  type?: PaymentHistoryFilter;
  limit?: number;
}

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    const ts = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof ts.toDate === 'function') {
      try {
        return ts.toDate().toISOString();
      } catch {
        return undefined;
      }
    }
    const seconds = ts._seconds ?? ts.seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000).toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function sortKey(record: TenantPaymentRecord): number {
  return new Date(record.paidAt || record.createdAt || 0).getTime();
}

function mapReceipt(doc: FirestoreDoc): TenantPaymentRecord {
  const data = doc.data();
  const paidAt = toIso(data.date) || toIso(data.createdAt);
  return {
    id: doc.id,
    source: 'receipt',
    category: 'membership',
    description: data.items?.[0]?.description
      ? `Membresía — ${data.items[0].description}`
      : 'Membresía',
    amount: Number(data.total) || 0,
    currency: String(data.currency || 'USD').toUpperCase(),
    status: 'paid',
    paidAt,
    createdAt: paidAt,
    receiptNumber: data.receiptNumber || data.transactionId,
    stripePaymentIntentId:
      typeof data.transactionId === 'string' && data.transactionId.startsWith('pi_')
        ? data.transactionId
        : undefined,
  };
}

function mapPromotion(doc: FirestoreDoc): TenantPaymentRecord {
  const data = doc.data();
  const createdAt = toIso(data.requestedAt) || toIso(data.createdAt);
  const paidAt = toIso(data.completedAt) || toIso(data.paidAt) || createdAt;
  return {
    id: doc.id,
    source: 'paid_promotion_request',
    category: 'promotion',
    description: `Promoción ${data.promotionScope || 'general'} — ${data.duration || '?'} días`,
    amount: Number(data.price) || 0,
    currency: String(data.currency || 'USD').toUpperCase(),
    status: String(data.status || 'unknown'),
    createdAt,
    paidAt,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
  };
}

function mapBanner(doc: FirestoreDoc): TenantPaymentRecord {
  const data = doc.data();
  const createdAt = toIso(data.createdAt);
  const paidAt = toIso(data.paidAt) || createdAt;
  return {
    id: doc.id,
    source: 'premium_banner',
    category: 'banner',
    description: `Banner premium: ${data.title || 'Sin título'} — ${data.duration || '?'} días`,
    amount: Number(data.price) || 0,
    currency: String(data.currency || 'USD').toUpperCase(),
    status: String(data.status || data.paymentStatus || 'paid'),
    createdAt,
    paidAt,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
  };
}

function isPaidFeatured(data: Record<string, unknown>): boolean {
  if (data.paidAt) return true;
  const status = String(data.status || '');
  return status === 'paid' || status === 'active' || status === 'completed';
}

function mapFeatured(doc: FirestoreDoc): TenantPaymentRecord {
  const data = doc.data();
  const createdAt = toIso(data.createdAt);
  const paidAt = toIso(data.paidAt) || createdAt;
  const planLabel = (data.plan as { label?: string } | undefined)?.label || data.planId || 'Destacado';
  const targetLabel = data.targetType === 'dealer' ? 'concesionario' : 'vehículo';
  return {
    id: doc.id,
    source: 'featured_promotion_request',
    category: 'featured',
    description: `Destacado (${targetLabel}): ${planLabel}`,
    amount: Number(data.price) || 0,
    currency: String(data.currency || 'USD').toUpperCase(),
    status: String(data.status || 'unknown'),
    createdAt,
    paidAt,
    stripePaymentIntentId: data.stripePaymentIntentId as string | undefined,
  };
}

async function queryWithFallback(
  run: () => Promise<admin.firestore.QuerySnapshot>,
  fallback: () => Promise<admin.firestore.QuerySnapshot>
): Promise<admin.firestore.QuerySnapshot> {
  try {
    return await run();
  } catch {
    return fallback();
  }
}

async function fetchReceipts(tenantId: string, limit: number): Promise<TenantPaymentRecord[]> {
  const db = getFirestore();
  const snap = await queryWithFallback(
    () =>
      db
        .collection('receipts')
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get(),
    () =>
      db.collection('receipts').where('tenantId', '==', tenantId).limit(limit).get()
  );
  return snap.docs.map(mapReceipt);
}

async function fetchPromotions(tenantId: string, limit: number): Promise<TenantPaymentRecord[]> {
  const db = getFirestore();
  const ref = db.collection('tenants').doc(tenantId).collection('paid_promotion_requests');
  const snap = await queryWithFallback(
    () => ref.orderBy('requestedAt', 'desc').limit(limit).get(),
    () => ref.limit(limit).get()
  );
  return snap.docs
    .map(mapPromotion)
    .filter((p) => p.status === 'completed' || p.status === 'active' || Boolean(p.paidAt));
}

async function fetchBanners(tenantId: string, limit: number): Promise<TenantPaymentRecord[]> {
  const db = getFirestore();
  const ref = db.collection('tenants').doc(tenantId).collection('premium_banners');
  const [paidSnap, statusSnap] = await Promise.all([
    queryWithFallback(
      () => ref.where('paid', '==', true).orderBy('paidAt', 'desc').limit(limit).get(),
      () => ref.where('paid', '==', true).limit(limit).get()
    ),
    queryWithFallback(
      () => ref.where('paymentStatus', '==', 'paid').orderBy('paidAt', 'desc').limit(limit).get(),
      () => ref.where('paymentStatus', '==', 'paid').limit(limit).get()
    ),
  ]);

  const seen = new Set<string>();
  const records: TenantPaymentRecord[] = [];
  for (const doc of [...paidSnap.docs, ...statusSnap.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    records.push(mapBanner(doc));
  }
  return records;
}

async function fetchFeatured(tenantId: string, limit: number): Promise<TenantPaymentRecord[]> {
  const db = getFirestore();
  const ref = db.collection('tenants').doc(tenantId).collection('featured_promotion_requests');
  const snap = await queryWithFallback(
    () => ref.orderBy('createdAt', 'desc').limit(limit).get(),
    () => ref.limit(limit).get()
  );
  return snap.docs.filter((doc) => isPaidFeatured(doc.data())).map(mapFeatured);
}

async function fetchStripeInvoices(
  billingTenantId: string,
  limit: number,
  existingTransactionIds: Set<string>
): Promise<TenantPaymentRecord[]> {
  try {
    const subscription = await getSubscriptionByTenantId(billingTenantId);
    const customerId = subscription?.stripeCustomerId?.trim();
    if (!customerId) return [];

    const { getStripeInstance } = await import('@autodealers/core');
    const stripe = await getStripeInstance();
    const invoices = await stripe.invoices.list({ customer: customerId, limit });

    return invoices.data
      .filter((invoice) => invoice.status === 'paid' && invoice.amount_paid > 0)
      .filter((invoice) => {
        const txId =
          typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent?.id;
        if (txId && existingTransactionIds.has(txId)) return false;
        if (existingTransactionIds.has(invoice.id)) return false;
        return true;
      })
      .map((invoice) => {
        const paidAt = invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date(invoice.created * 1000).toISOString();
        const txId =
          typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent?.id;
        return {
          id: invoice.id,
          source: 'stripe_invoice' as const,
          category: 'membership' as const,
          description: invoice.description || `Factura ${invoice.number || invoice.id}`,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'paid',
          paidAt,
          createdAt: new Date(invoice.created * 1000).toISOString(),
          invoiceUrl: invoice.hosted_invoice_url || undefined,
          receiptNumber: invoice.number || undefined,
          stripePaymentIntentId: txId,
        };
      });
  } catch (error) {
    console.warn('[listTenantPaymentHistory] Stripe invoices skipped:', error);
    return [];
  }
}

/**
 * Unified payment history for dealer/seller portals.
 */
export async function listTenantPaymentHistory(
  options: ListTenantPaymentHistoryOptions
): Promise<TenantPaymentRecord[]> {
  const {
    marketplaceTenantId,
    billingTenantId = marketplaceTenantId,
    type = 'all',
    limit = 100,
  } = options;

  const perSourceLimit = Math.min(limit, 100);
  const includeMembership = type === 'all' || type === 'membership';
  const includePromotion = type === 'all' || type === 'promotion';
  const includeBanner = type === 'all' || type === 'banner';
  const includeFeatured = type === 'all' || type === 'featured';

  const [receipts, promotions, banners, featured] = await Promise.all([
    includeMembership ? fetchReceipts(billingTenantId, perSourceLimit) : Promise.resolve([]),
    includePromotion ? fetchPromotions(marketplaceTenantId, perSourceLimit) : Promise.resolve([]),
    includeBanner ? fetchBanners(marketplaceTenantId, perSourceLimit) : Promise.resolve([]),
    includeFeatured ? fetchFeatured(marketplaceTenantId, perSourceLimit) : Promise.resolve([]),
  ]);

  const existingTransactionIds = new Set<string>();
  for (const record of receipts) {
    if (record.stripePaymentIntentId) existingTransactionIds.add(record.stripePaymentIntentId);
    if (record.receiptNumber) existingTransactionIds.add(record.receiptNumber);
    existingTransactionIds.add(record.id);
  }

  const stripeInvoices = includeMembership
    ? await fetchStripeInvoices(billingTenantId, perSourceLimit, existingTransactionIds)
    : [];

  const combined = [...receipts, ...stripeInvoices, ...promotions, ...banners, ...featured];
  combined.sort((a, b) => sortKey(b) - sortKey(a));

  return combined.slice(0, limit);
}
