/**
 * Venta de banners / promociones / destacados desde el portal de empleados de ventas.
 * Crea el inventario en el tenant del cliente, cobra (cliente / empleado / link) y deja
 * comisión 25% cuando el pago + aprobación están listos.
 */

import * as admin from 'firebase-admin';
import type Stripe from 'stripe';
import { getFirestore } from './firebase';
import { getStripeInstance } from './stripe-helper';
import {
  getBannerDurations,
  getBannerPrice,
  getPromotionDurations,
  getPromotionPrice,
} from './pricing-config';
import { getFeaturedConfig } from './featured-promotions';
import { notifyUser } from './notifications';
import { sendConfiguredEmail } from './email-delivery';
import { PLATFORM_NAME } from '@autodealers/shared/platform-sender';
import {
  resolveBusinessUrl,
  resolveDealerUrl,
  resolvePublicWebUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';
import {
  SALES_LINKS_COL,
  createSalesEmployeeAdCommission,
  createSalesEmployeePaymentLink,
  listSalesEmployeeAccounts,
  salesEmployeeMetadataForTenant,
} from './sales-employees';

export const SALES_AD_ORDERS_COL = 'sales_employee_ad_orders';

export type SalesAdProductKind = 'banner' | 'paid_promotion' | 'featured_promotion';
export type SalesAdPayMode = 'client' | 'employee' | 'link';
export type SalesAdOrderStatus =
  | 'awaiting_client_payment'
  | 'awaiting_payment'
  | 'paid_pending_approval'
  | 'active'
  | 'queued'
  | 'cancelled'
  | 'expired';

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function stripeAmountCents(price: number): number {
  return Math.round(Number(price) * 100);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function productKindLabel(kind: SalesAdProductKind): string {
  if (kind === 'banner') return 'banner premium';
  if (kind === 'paid_promotion') return 'promoción pagada';
  return 'destacado';
}

function clientPanelPayUrl(role: string, productKind: SalesAdProductKind): string {
  const base =
    role === 'seller'
      ? resolveSellerUrl()
      : role === 'business' || role === 'automotive_business'
        ? resolveBusinessUrl()
        : resolveDealerUrl();
  if (role === 'business' || role === 'automotive_business') {
    return `${base}/dashboard`;
  }
  if (productKind === 'banner') return `${base}/banners`;
  return `${base}/promotions`;
}

/** Email + notificación in-app cuando el cliente debe pagar en su panel. */
async function notifyClientPendingAdPayment(input: {
  tenantId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  productKind: SalesAdProductKind;
  label: string;
  price: number;
  inventoryId: string;
}): Promise<void> {
  const kindLabel = productKindLabel(input.productKind);
  const payUrl = clientPanelPayUrl(input.role, input.productKind);
  const title =
    input.productKind === 'banner'
      ? 'Banner premium pendiente de pago'
      : input.productKind === 'paid_promotion'
        ? 'Promoción pendiente de pago'
        : 'Destacado pendiente de pago';
  const message = `Se te asignó "${input.label}" ($${Number(input.price).toFixed(2)}). Entra a tu panel y págalo para activarlo.`;

  await notifyUser(input.tenantId, input.userId, {
    type: 'promotion',
    title,
    message,
    metadata: {
      inventoryId: input.inventoryId,
      productKind: input.productKind,
      price: input.price,
      source: 'sales_employee',
      payUrl,
    },
    // Email dedicado abajo (con CTA). Aquí solo in-app + push.
    channels: ['system', 'push'],
  }).catch((err) => console.warn('[sales-ads] notifyUser failed:', err));

  if (!input.email) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: #0f172a;">Tienes un ${escapeHtml(kindLabel)} pendiente de pago</h2>
      <p>Hola <strong>${escapeHtml(input.name || 'cliente')}</strong>,</p>
      <p>
        Tu asesor de ventas te asignó <strong>${escapeHtml(input.label)}</strong>
        por <strong>$${Number(input.price).toFixed(2)} USD</strong>.
      </p>
      <p>Para activarlo, entra a tu panel, ve a la sección correspondiente y completa el pago.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(payUrl)}"
           style="background: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Abrir mi panel y pagar
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">
        Si el botón no funciona, copia este enlace:<br/>
        <a href="${escapeHtml(payUrl)}">${escapeHtml(payUrl)}</a>
      </p>
      <p style="font-size: 12px; color: #888; margin-top: 24px;">
        ${escapeHtml(PLATFORM_NAME)} · No respondas a este correo automático.
      </p>
    </div>
  `;

  await sendConfiguredEmail({
    to: input.email,
    subject: `${title} — ${PLATFORM_NAME}`,
    html,
  }).catch((err) => console.warn('[sales-ads] pending payment email failed:', err));
}

async function requireEmployeeAccount(employeeId: string, accountId: string) {
  const accounts = await listSalesEmployeeAccounts(employeeId);
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new Error('Cuenta de cliente no encontrada o no es tuya.');
  return account;
}

export async function getSalesAdCatalog(role: 'dealer' | 'seller' | 'business') {
  const bannerPlacement = 'hero' as const;
  const bannerDurations = await getBannerDurations(bannerPlacement);
  const banners = [];
  for (const duration of bannerDurations) {
    const price = await getBannerPrice(bannerPlacement, duration);
    if (price > 0) banners.push({ duration, price, placement: bannerPlacement });
  }

  const promoScope = role === 'seller' ? ('seller' as const) : ('dealer' as const);
  const promoDurations = await getPromotionDurations(promoScope);
  const promotions = [];
  for (const duration of promoDurations) {
    const price = await getPromotionPrice(promoScope, duration);
    if (price > 0) promotions.push({ duration, price, scope: promoScope });
  }

  const featuredConfig = await getFeaturedConfig();
  const featuredTarget =
    role === 'seller' ? 'seller' : role === 'dealer' || role === 'business' ? 'dealer' : 'dealer';
  const featured = (featuredConfig.plans || [])
    .filter((plan) => plan.active && plan.targetType === featuredTarget)
    .map((plan) => ({
      id: plan.id,
      label: plan.label,
      price: plan.price,
      durationHours: plan.durationHours,
      targetType: plan.targetType,
      kind: plan.kind,
    }));

  return {
    banners,
    promotions,
    featured,
    payModes: [
      { id: 'client', label: 'El cliente paga en su panel' },
      { id: 'employee', label: 'Yo cobro ahora (Checkout)' },
      { id: 'link', label: 'Link de pago para enviar' },
    ] as Array<{ id: SalesAdPayMode; label: string }>,
  };
}

type CreateAdOrderInput = {
  employeeId: string;
  accountId: string;
  productKind: SalesAdProductKind;
  payMode: SalesAdPayMode;
  title?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  linkType?: string;
  linkValue?: string;
  duration?: number;
  promotionScope?: 'vehicle' | 'dealer' | 'seller';
  vehicleId?: string;
  featuredPlanId?: string;
  name?: string;
};

export async function createSalesEmployeeAdOrder(input: CreateAdOrderInput) {
  const account = await requireEmployeeAccount(input.employeeId, input.accountId);
  const db = getFirestore();
  const payMode = input.payMode;
  if (payMode !== 'client' && payMode !== 'employee' && payMode !== 'link') {
    throw new Error('Modo de pago inválido.');
  }

  const employeeMeta = await salesEmployeeMetadataForTenant(account.tenantId);
  const employeeId = input.employeeId;

  let price = 0;
  let duration = Number(input.duration || 0);
  let inventoryCollection = '';
  let inventoryId = '';
  let stripeType = '';
  let label = '';
  const extraMeta: Record<string, string> = {};

  if (input.productKind === 'banner') {
    const title = String(input.title || '').trim();
    const description = String(input.description || '').trim();
    const imageUrl = String(input.imageUrl || '').trim();
    if (!title || !description || !imageUrl || !duration) {
      throw new Error('Banner: título, descripción, imagen y duración son obligatorios.');
    }
    price = await getBannerPrice('hero', duration);
    if (price <= 0) throw new Error('Duración de banner no válida.');

    const activeSnap = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get()
      .catch((err) => {
        // Índice o red: no bloquear la creación del anuncio asignado.
        console.warn('[sales-ads] active banners count skipped:', err);
        return { size: 0 } as FirebaseFirestore.QuerySnapshot;
      });
    if (activeSnap.size >= 4 && payMode !== 'client') {
      // still allow assign; activation may queue
    }

    const ref = db.collection('tenants').doc(account.tenantId).collection('premium_banners').doc();
    await ref.set({
      title,
      description,
      ctaText: String(input.ctaText || 'Ver más').trim() || 'Ver más',
      linkType: String(input.linkType || 'filter'),
      linkValue: String(input.linkValue || ''),
      imageUrl,
      duration,
      price,
      status: 'assigned',
      approved: true,
      paymentStatus: 'pending',
      assignedTo: account.userId,
      assignedToTenantId: account.tenantId,
      assignedBy: employeeId,
      assignedByRole: 'sales_employee',
      assignedAt: nowTs(),
      salesEmployeeId: employeeId,
      salesAccountId: account.id,
      source: 'sales_employee',
      views: 0,
      clicks: 0,
      priority: 0,
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });
    inventoryCollection = 'premium_banners';
    inventoryId = ref.id;
    stripeType = 'premium_banner';
    label = `Banner: ${title}`;
    extraMeta.bannerId = ref.id;
    extraMeta.isAssigned = 'true';
    extraMeta.duration = String(duration);
    extraMeta.assignedByRole = 'sales_employee';
    extraMeta.salesEmployeeId = employeeId;
    extraMeta.source = 'sales_employee';
  } else if (input.productKind === 'paid_promotion') {
    const scope =
      input.promotionScope ||
      (account.role === 'seller' ? 'seller' : 'dealer');
    if (scope === 'vehicle' && !String(input.vehicleId || '').trim()) {
      throw new Error('Para promoción de vehículo indica el vehicleId.');
    }
    if (!duration) throw new Error('Duración de promoción obligatoria.');
    price = await getPromotionPrice(scope, duration);
    if (price <= 0) throw new Error('Duración de promoción no válida.');
    const name =
      String(input.name || input.title || '').trim() ||
      `Promoción ${scope} - ${duration} días`;
    const description = String(input.description || '').trim();

    const ref = db
      .collection('tenants')
      .doc(account.tenantId)
      .collection('paid_promotion_requests')
      .doc();
    await ref.set({
      promotionScope: scope,
      vehicleId: scope === 'vehicle' ? String(input.vehicleId).trim() : null,
      duration,
      price,
      name,
      description,
      status: 'assigned',
      paymentStatus: 'pending',
      assignedTo: account.userId,
      assignedToTenantId: account.tenantId,
      assignedBy: employeeId,
      assignedByRole: 'sales_employee',
      assignedAt: nowTs(),
      requestedBy: account.userId,
      requestedAt: nowTs(),
      salesEmployeeId: employeeId,
      salesAccountId: account.id,
      source: 'sales_employee',
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });
    inventoryCollection = 'paid_promotion_requests';
    inventoryId = ref.id;
    stripeType = 'paid_promotion';
    label = name;
    extraMeta.requestId = ref.id;
    extraMeta.promotionScope = scope;
    if (scope === 'vehicle') extraMeta.vehicleId = String(input.vehicleId).trim();
    extraMeta.duration = String(duration);
    extraMeta.isAssigned = 'true';
    extraMeta.assignedByRole = 'sales_employee';
    extraMeta.salesEmployeeId = employeeId;
    extraMeta.source = 'sales_employee';
  } else if (input.productKind === 'featured_promotion') {
    const planId = String(input.featuredPlanId || '').trim();
    if (!planId) throw new Error('Selecciona un plan de destacado.');
    const config = await getFeaturedConfig();
    const plan = (config.plans || []).find((item) => item.id === planId && item.active);
    if (!plan) throw new Error('Plan de destacado no válido.');
    const targetType = plan.targetType;
    const targetId =
      targetType === 'vehicle'
        ? String(input.vehicleId || '').trim()
        : account.role === 'seller'
          ? account.userId
          : account.tenantId;
    if (targetType === 'vehicle' && !targetId) {
      throw new Error('Para destacar un vehículo indica el vehicleId.');
    }
    price = Number(plan.price);
    duration = Math.round(Number(plan.durationHours) / 24) || 1;

    const ref = db
      .collection('tenants')
      .doc(account.tenantId)
      .collection('featured_promotion_requests')
      .doc();
    await ref.set({
      planId: plan.id,
      targetType,
      targetId,
      kind: plan.kind,
      durationHours: plan.durationHours,
      price,
      currency: 'usd',
      status: 'assigned',
      paymentStatus: 'pending',
      assignedTo: account.userId,
      assignedBy: employeeId,
      assignedByRole: 'sales_employee',
      salesEmployeeId: employeeId,
      salesAccountId: account.id,
      source: 'sales_employee',
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });
    inventoryCollection = 'featured_promotion_requests';
    inventoryId = ref.id;
    stripeType = 'featured_promotion';
    label = plan.label;
    extraMeta.requestId = ref.id;
    extraMeta.planId = plan.id;
    extraMeta.targetType = targetType;
    extraMeta.targetId = targetId;
    extraMeta.isAssigned = 'true';
    extraMeta.assignedByRole = 'sales_employee';
    extraMeta.salesEmployeeId = employeeId;
    extraMeta.source = 'sales_employee';
  } else {
    throw new Error('Tipo de producto no válido.');
  }

  const orderRef = db.collection(SALES_AD_ORDERS_COL).doc();
  const status: SalesAdOrderStatus =
    payMode === 'client' ? 'awaiting_client_payment' : 'awaiting_payment';

  await orderRef.set({
    employeeId,
    accountId: account.id,
    tenantId: account.tenantId,
    userId: account.userId,
    clientRole: account.role,
    clientName: account.companyName || account.name,
    productKind: input.productKind,
    payMode,
    status,
    price,
    currency: 'usd',
    duration,
    label,
    inventoryCollection,
    inventoryId,
    stripeType,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    checkoutUrl: null,
    commissionCreated: false,
    source: 'sales_employee',
    createdAt: nowTs(),
    updatedAt: nowTs(),
  });

  // Vincular orderId al inventario para que el pago del cliente en su panel genere comisión.
  if (inventoryCollection && inventoryId) {
    await db
      .collection('tenants')
      .doc(account.tenantId)
      .collection(inventoryCollection)
      .doc(inventoryId)
      .set({ salesAdOrderId: orderRef.id, source: 'sales_employee' }, { merge: true });
  }

  let checkoutUrl: string | null = null;
  let stripeSessionId: string | null = null;
  let linkId: string | null = null;
  let checkoutError: string | null = null;

  if (payMode === 'client') {
    // Notificación in-app + email con CTA al panel (no crea Checkout).
    await notifyClientPendingAdPayment({
      tenantId: account.tenantId,
      userId: account.userId,
      email: account.email,
      name: account.name || account.companyName || account.email,
      role: account.role,
      productKind: input.productKind,
      label,
      price,
      inventoryId,
    });
  } else if (payMode === 'employee' || payMode === 'link') {
    // Inventario ya quedó assigned + pending. Si Stripe falla, NO se borra.
    try {
      const paid = await createSalesAdCheckoutSession({
        orderId: orderRef.id,
        employeeId,
        accountId: account.id,
        tenantId: account.tenantId,
        userId: account.userId,
        email: account.email,
        name: account.name,
        price,
        label,
        stripeType,
        extraMeta: { ...extraMeta, ...employeeMeta },
        payMode,
      });
      checkoutUrl = paid.checkoutUrl;
      stripeSessionId = paid.sessionId;
      linkId = paid.linkId;
      await orderRef.update({
        checkoutUrl,
        stripeSessionId,
        paymentLinkId: linkId,
        checkoutError: null,
        updatedAt: nowTs(),
      });
    } catch (err) {
      checkoutError =
        err instanceof Error ? err.message : 'No se pudo crear el link de pago en Stripe';
      console.error('[sales-ads] checkout session failed (inventory kept):', checkoutError);
      await orderRef.update({
        checkoutUrl: null,
        checkoutError,
        updatedAt: nowTs(),
      });
    }
  }

  return {
    orderId: orderRef.id,
    inventoryId,
    productKind: input.productKind,
    payMode,
    status,
    price,
    label,
    checkoutUrl,
    stripeSessionId,
    linkId,
    checkoutError,
  };
}

async function createSalesAdCheckoutSession(input: {
  orderId: string;
  employeeId: string;
  accountId: string;
  tenantId: string;
  userId: string;
  email: string;
  name: string;
  price: number;
  label: string;
  stripeType: string;
  extraMeta: Record<string, string>;
  payMode: SalesAdPayMode;
}) {
  const stripe = await getStripeInstance();
  const base = resolvePublicWebUrl();
  const amount = stripeAmountCents(input.price);
  if (amount < 50) throw new Error('El precio mínimo de Stripe es $0.50.');

  let customerId: string | undefined;
  const email = String(input.email || '').trim();
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data[0]) customerId = existing.data[0].id;
    else {
      const customer = await stripe.customers.create({
        email,
        name: input.name || email,
        metadata: {
          userId: input.userId,
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          source: 'sales_employee_ad',
        },
      });
      customerId = customer.id;
    }
  }

  // Metadata mínima: Stripe falla si hay demasiadas claves / valores largos (imageUrl, description, etc.).
  const metadata: Record<string, string> = {
    type: input.stripeType,
    tenantId: input.tenantId,
    userId: input.userId,
    employeeId: input.employeeId,
    source: 'sales_employee',
    salesAdOrderId: input.orderId,
    payMode: input.payMode,
    assignedByRole: 'sales_employee',
    isAssigned: 'true',
  };
  for (const key of [
    'bannerId',
    'requestId',
    'planId',
    'targetType',
    'targetId',
    'promotionScope',
    'vehicleId',
    'duration',
    'salesEmployeeId',
  ] as const) {
    const value = input.extraMeta[key];
    if (value != null && String(value).trim()) {
      metadata[key] = String(value).slice(0, 500);
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: input.label.slice(0, 120) || 'Anuncio AutoDealers',
            description: `Venta empleado · ${input.stripeType}`.slice(0, 500),
          },
        },
      },
    ],
    // cancel_url solo vuelve al dashboard: NUNCA borra inventario ni la orden.
    success_url: `${base}/sales/dashboard?tab=anuncios&ad_paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/sales/dashboard?tab=anuncios&ad_paid=0`,
    metadata,
    payment_intent_data: { metadata },
  };
  if (customerId) sessionParams.customer = customerId;
  else if (email) sessionParams.customer_email = email;

  const session = await stripe.checkout.sessions.create(sessionParams);

  const checkoutUrl = session.url || null;
  if (!checkoutUrl) {
    throw new Error(
      `Stripe no devolvió URL de Checkout (session ${session.id}, status=${session.status || 'n/a'}).`
    );
  }

  const linkId = await createSalesEmployeePaymentLink({
    employeeId: input.employeeId,
    accountId: input.accountId,
    membershipId: `ad:${input.orderId}`,
    checkoutUrl,
    stripeSessionId: session.id,
  });

  await getFirestore().collection(SALES_LINKS_COL).doc(linkId).set(
    {
      kind: 'ad',
      salesAdOrderId: input.orderId,
      productType: input.stripeType,
      amount: input.price,
    },
    { merge: true }
  );

  return { checkoutUrl, sessionId: session.id, linkId };
}

/** Regenera Checkout URL para una orden pendiente (sin borrar inventario). */
export async function regenerateSalesAdCheckoutUrl(input: {
  employeeId: string;
  orderId: string;
}) {
  const db = getFirestore();
  const orderRef = db.collection(SALES_AD_ORDERS_COL).doc(input.orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw new Error('Orden no encontrada.');
  const data = snap.data() || {};
  if (String(data.employeeId || '') !== input.employeeId) {
    throw new Error('No autorizado para esta orden.');
  }
  const status = String(data.status || '');
  if (status === 'active' || status === 'cancelled') {
    throw new Error('Esta orden ya no admite un nuevo link de pago.');
  }
  const payMode = String(data.payMode || '') as SalesAdPayMode;
  if (payMode !== 'employee' && payMode !== 'link') {
    throw new Error('Solo aplica a modos link o Checkout del empleado.');
  }

  const account = await requireEmployeeAccount(input.employeeId, String(data.accountId || ''));
  const employeeMeta = await salesEmployeeMetadataForTenant(account.tenantId);
  const inventoryCollection = String(data.inventoryCollection || '');
  const inventoryId = String(data.inventoryId || '');
  const extraMeta: Record<string, string> = {
    isAssigned: 'true',
    assignedByRole: 'sales_employee',
    salesEmployeeId: input.employeeId,
    source: 'sales_employee',
  };
  if (inventoryCollection === 'premium_banners' && inventoryId) {
    extraMeta.bannerId = inventoryId;
  } else if (inventoryId) {
    extraMeta.requestId = inventoryId;
  }

  const paid = await createSalesAdCheckoutSession({
    orderId: input.orderId,
    employeeId: input.employeeId,
    accountId: account.id,
    tenantId: account.tenantId,
    userId: account.userId,
    email: account.email,
    name: account.name,
    price: Number(data.price || 0),
    label: String(data.label || 'Anuncio'),
    stripeType: String(data.stripeType || 'premium_banner'),
    extraMeta: { ...extraMeta, ...employeeMeta },
    payMode,
  });

  await orderRef.update({
    checkoutUrl: paid.checkoutUrl,
    stripeSessionId: paid.sessionId,
    paymentLinkId: paid.linkId,
    checkoutError: null,
    status: 'awaiting_payment',
    updatedAt: nowTs(),
  });

  return {
    orderId: input.orderId,
    checkoutUrl: paid.checkoutUrl,
    stripeSessionId: paid.sessionId,
    linkId: paid.linkId,
  };
}

export async function listSalesEmployeeAdOrders(employeeId?: string) {
  let query: FirebaseFirestore.Query = getFirestore().collection(SALES_AD_ORDERS_COL);
  if (employeeId) query = query.where('employeeId', '==', employeeId);
  const snap = await query.limit(300).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        paidAt: toIso(data.paidAt),
      };
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function markSalesEmployeeAdOrderPaid(input: {
  salesAdOrderId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  amountPaid?: number;
  currency?: string;
}): Promise<void> {
  const db = getFirestore();
  let orderSnap: FirebaseFirestore.DocumentSnapshot | null = null;

  if (input.salesAdOrderId) {
    const snap = await db.collection(SALES_AD_ORDERS_COL).doc(input.salesAdOrderId).get();
    if (snap.exists) orderSnap = snap;
  }
  if (!orderSnap && input.stripeSessionId) {
    const bySession = await db
      .collection(SALES_AD_ORDERS_COL)
      .where('stripeSessionId', '==', input.stripeSessionId)
      .limit(1)
      .get();
    if (!bySession.empty) orderSnap = bySession.docs[0];
  }
  if (!orderSnap) return;

  const data = orderSnap.data() || {};
  const employeeId = String(data.employeeId || '');
  const tenantId = String(data.tenantId || '');
  const stripeType = String(data.stripeType || data.productKind || 'premium_banner');
  const amountPaid = Number(input.amountPaid || data.price || 0);
  const alreadyCommission = data.commissionCreated === true;

  const inventoryCollection = String(data.inventoryCollection || '');
  const inventoryId = String(data.inventoryId || '');

  // Activar inventario tipo asignado
  if (tenantId && inventoryCollection && inventoryId) {
    if (inventoryCollection === 'premium_banners') {
      await activateAssignedBanner(tenantId, inventoryId, input.stripePaymentIntentId || null);
    } else if (inventoryCollection === 'paid_promotion_requests') {
      const { activatePaidPromotionFromIntent } = await import('./paid-inventory-stripe');
      await activatePaidPromotionFromIntent({
        tenantId,
        requestId: inventoryId,
        paymentIntentId: String(input.stripePaymentIntentId || input.stripeSessionId || orderSnap.id),
        metadata: { isAssigned: 'true' },
      });
    } else if (inventoryCollection === 'featured_promotion_requests') {
      const { activateFeaturedPromotionFromIntent } = await import('./paid-inventory-stripe');
      await activateFeaturedPromotionFromIntent({
        tenantId,
        requestId: inventoryId,
        paymentIntentId: String(input.stripePaymentIntentId || input.stripeSessionId || orderSnap.id),
        userId: String(data.userId || ''),
      });
    }
  }

  if (!alreadyCommission && employeeId && amountPaid > 0) {
    await createSalesEmployeeAdCommission({
      employeeId,
      tenantId,
      amountPaid,
      currency: input.currency || 'usd',
      stripePaymentIntentId: input.stripePaymentIntentId || undefined,
      adKind: stripeType === 'assigned_banner' ? 'premium_banner' : stripeType,
      salesAdOrderId: orderSnap.id,
      source: 'sales_employee',
      assignedByRole: 'sales_employee',
      salesEmployeeId: employeeId,
    });
  }

  await orderSnap.ref.set(
    {
      status: 'active',
      paymentStatus: 'paid',
      paidAt: nowTs(),
      stripePaymentIntentId: input.stripePaymentIntentId || data.stripePaymentIntentId || null,
      commissionCreated: true,
      updatedAt: nowTs(),
    },
    { merge: true }
  );

  if (input.stripeSessionId) {
    const links = await db
      .collection(SALES_LINKS_COL)
      .where('stripeSessionId', '==', input.stripeSessionId)
      .limit(1)
      .get();
    if (!links.empty) {
      await links.docs[0].ref.update({ status: 'paid', paidAt: nowTs(), updatedAt: nowTs() });
    }
  }
}

async function activateAssignedBanner(
  tenantId: string,
  bannerId: string,
  paymentIntentId: string | null
) {
  const db = getFirestore();
  const bannerRef = db.collection('tenants').doc(tenantId).collection('premium_banners').doc(bannerId);
  const bannerDoc = await bannerRef.get();
  if (!bannerDoc.exists) return;
  const bannerData = bannerDoc.data() || {};
  if (bannerData.status === 'active' && bannerData.paymentStatus === 'paid') return;

  const activeSnap = await db
    .collectionGroup('premium_banners')
    .where('status', '==', 'active')
    .where('approved', '==', true)
    .get();

  const duration = Number(bannerData.duration || 7);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (duration > 0 ? duration : 7));

  if (activeSnap.size >= 4) {
    await bannerRef.update({
      status: 'queued',
      queuedAt: nowTs(),
      paymentStatus: 'paid',
      paid: true,
      paidAt: nowTs(),
      stripePaymentIntentId: paymentIntentId,
      updatedAt: nowTs(),
    });
    return;
  }

  await bannerRef.update({
    status: 'active',
    approved: true,
    paymentStatus: 'paid',
    paid: true,
    paidAt: nowTs(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    stripePaymentIntentId: paymentIntentId,
    priority: activeSnap.size + 1,
    activatedAt: nowTs(),
    updatedAt: nowTs(),
  });

  if (bannerData.assignedTo) {
    await notifyUser(tenantId, String(bannerData.assignedTo), {
      type: 'promotion',
      title: 'Banner Premium activado',
      message: `Tu banner "${bannerData.title || ''}" ya está activo.`,
      metadata: { bannerId },
    });
  }
}

/** Si un banner pagado se aprueba y hay empleado de ventas, asegurar comisión. */
export async function ensureSalesAdCommissionOnBannerApprove(input: {
  tenantId: string;
  bannerId: string;
}): Promise<void> {
  const db = getFirestore();
  const bannerRef = db
    .collection('tenants')
    .doc(input.tenantId)
    .collection('premium_banners')
    .doc(input.bannerId);
  const snap = await bannerRef.get();
  if (!snap.exists) return;
  const data = snap.data() || {};
  if (data.paid !== true && data.paymentStatus !== 'paid') return;

  // Solo banners creados desde el portal de ventas.
  if (String(data.assignedByRole || '') !== 'sales_employee' && !data.salesEmployeeId) {
    return;
  }
  const employeeId = String(data.salesEmployeeId || '').trim();
  const amountPaid = Number(data.price || 0);
  const pi = String(data.stripePaymentIntentId || data.paymentIntentId || '').trim();
  if (!employeeId || amountPaid <= 0) return;

  await createSalesEmployeeAdCommission({
    employeeId,
    tenantId: input.tenantId,
    amountPaid,
    currency: 'usd',
    stripePaymentIntentId: pi || `banner_approve_${input.bannerId}`,
    adKind: 'premium_banner',
    source: 'sales_employee',
    assignedByRole: 'sales_employee',
    salesEmployeeId: employeeId,
    salesAdOrderId: null,
  });

  const orders = await db
    .collection(SALES_AD_ORDERS_COL)
    .where('inventoryId', '==', input.bannerId)
    .where('tenantId', '==', input.tenantId)
    .limit(1)
    .get();
  if (!orders.empty) {
    await orders.docs[0].ref.set(
      { status: 'active', commissionCreated: true, updatedAt: nowTs() },
      { merge: true }
    );
  }
}
