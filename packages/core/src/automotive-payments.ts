import { getFirestore } from '@autodealers/shared';
import { buildPublicWebUrl } from '@autodealers/shared/platform-urls';
import * as admin from 'firebase-admin';
import { isFeatureEnabled } from './feature-flags';
import { getStripeInstance } from './stripe-helper';
import { getTenantConnectStatus } from './stripe-connect-tenants';
import { createHash, randomBytes } from 'crypto';

function getDb() {
  return getFirestore();
}

export type PaymentApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'suspended';

export type PaymentMethodKey = 'card' | 'klarna' | 'affirm';

export interface PlatformPaymentFees {
  cardBps: number;
  klarnaBps: number;
  affirmBps: number;
}

const DEFAULT_FEES: PlatformPaymentFees = {
  cardBps: 350,
  klarnaBps: 1000,
  affirmBps: 1000,
};

export interface PaymentCapability {
  tenantId: string;
  status: PaymentApplicationStatus;
  card: boolean;
  klarna: boolean;
  affirm: boolean;
  connectReady: boolean;
}

export const PAYMENTS_AGREEMENT_VERSION = '2026-09-05-bnpl';

export const PAYMENTS_AGREEMENT_TITLE = 'Acuerdo de AutoDealers Payments';

export function buildPaymentsAgreementText(fees: PlatformPaymentFees = DEFAULT_FEES): string {
  return `AutoDealers Payments es un servicio opcional para cobrar facturas de tu negocio en la plataforma. No es obligatorio: puedes crear y enviar estimados y facturas por correo sin activarlo.

Si lo solicitas y un administrador de AutoDealers lo aprueba:

1. Los cobros se procesan con Stripe Connect. Abres una cuenta Express a nombre de tu negocio y los depósitos llegan a esa cuenta según los plazos de Stripe.
2. El cliente paga el monto de la factura. AutoDealers retiene una comisión de plataforma (application fee) y tú recibes el neto.
3. Comisiones vigentes: tarjeta ${formatFeePercent(fees.cardBps)}; Klarna ${formatFeePercent(fees.klarnaBps)}; Affirm ${formatFeePercent(fees.affirmBps)}. Los montos del libro mayor se registran en centavos, no en decimales.
4. Klarna y Affirm se ofrecen al cliente solo si AutoDealers los tiene activos y tu negocio es elegible: solicitud aprobada, Stripe Connect cobrando y el método permitido para tu cuenta. Si no tienes cobros activos, no aparecen en el enlace de pago ni en las facturas.
5. Tú decides si activas cobros. Puedes seguir cobrando fuera de la plataforma (efectivo, ATH Móvil, transferencia, etc.).

Al solicitar cobros aceptas este acuerdo y las tarifas publicadas en esta página.`;
}

export const PAYMENTS_AGREEMENT_TEXT = buildPaymentsAgreementText();

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  card: 'Tarjeta',
  klarna: 'Klarna',
  affirm: 'Affirm',
};

export function parsePaymentMethodKey(value: unknown): PaymentMethodKey | null {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'card' || key === 'klarna' || key === 'affirm') return key;
  return null;
}

export function checkoutPaymentMethodTypes(capability: PaymentCapability): PaymentMethodKey[] {
  const types: PaymentMethodKey[] = [];
  if (capability.card) types.push('card');
  if (capability.klarna) types.push('klarna');
  if (capability.affirm) types.push('affirm');
  return types;
}

export function describeCustomerPayMethods(capability: PaymentCapability): string {
  const labels = checkoutPaymentMethodTypes(capability).map((key) =>
    key === 'card' ? 'tarjeta' : PAYMENT_METHOD_LABELS[key]
  );
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} o ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} o ${labels[labels.length - 1]}`;
}

export interface PlatformPaymentMethod {
  key: PaymentMethodKey;
  label: string;
  feeLabel: string;
  feeBps: number;
  flagEnabled: boolean;
  customerEligible: boolean;
}

export async function getPlatformPaymentMethodCatalog(capability?: PaymentCapability | null): Promise<{
  methods: PlatformPaymentMethod[];
  flags: { card: boolean; klarna: boolean; affirm: boolean };
  fees: PlatformPaymentFees;
  feeLabels: { card: string; klarna: string; affirm: string };
}> {
  const [fees, cardFlag, klarnaFlag, affirmFlag] = await Promise.all([
    getPlatformPaymentFees(),
    isFeatureEnabled('business', 'card_payments_enabled'),
    isFeatureEnabled('business', 'klarna_enabled'),
    isFeatureEnabled('business', 'affirm_enabled'),
  ]);
  const flags = {
    card: cardFlag !== false,
    klarna: Boolean(klarnaFlag),
    affirm: Boolean(affirmFlag),
  };
  const methods: PlatformPaymentMethod[] = (
    [
      { key: 'card' as const, flagEnabled: flags.card, customerEligible: Boolean(capability?.card) },
      { key: 'klarna' as const, flagEnabled: flags.klarna, customerEligible: Boolean(capability?.klarna) },
      { key: 'affirm' as const, flagEnabled: flags.affirm, customerEligible: Boolean(capability?.affirm) },
    ] as const
  ).map((item) => ({
    key: item.key,
    label: PAYMENT_METHOD_LABELS[item.key],
    feeBps: item.key === 'card' ? fees.cardBps : item.key === 'klarna' ? fees.klarnaBps : fees.affirmBps,
    feeLabel: formatFeePercent(
      item.key === 'card' ? fees.cardBps : item.key === 'klarna' ? fees.klarnaBps : fees.affirmBps
    ),
    flagEnabled: item.flagEnabled,
    customerEligible: item.customerEligible,
  }));
  return {
    methods,
    flags,
    fees,
    feeLabels: {
      card: formatFeePercent(fees.cardBps),
      klarna: formatFeePercent(fees.klarnaBps),
      affirm: formatFeePercent(fees.affirmBps),
    },
  };
}

export function formatFeePercent(bps: number): string {
  const value = Math.max(0, Number(bps) || 0) / 100;
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted}%`;
}

export function paymentLinkPublicUrl(token: string): string {
  return buildPublicWebUrl(`/pay/${encodeURIComponent(token)}`);
}

export function documentLinkPublicUrl(token: string): string {
  return buildPublicWebUrl(`/docs/${encodeURIComponent(token)}`);
}

export interface PaymentApplication {
  id: string;
  tenantId: string;
  userId: string;
  businessName: string;
  status: PaymentApplicationStatus;
  notes?: string;
  requestedMethods: PaymentMethodKey[];
  accepted?: boolean;
  acceptedAgreement?: boolean;
  acceptedAt?: Date;
  agreementVersion?: string;
  agreementAcceptedAt?: Date;
  agreementText?: string;
  agreementHash?: string;
  feesSnapshot?: PlatformPaymentFees;
  createdAt?: Date;
  updatedAt?: Date;
}

export function hashPaymentsAgreement(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function isPaymentAgreementAccepted(application?: PaymentApplication | null): boolean {
  if (!application) return false;
  return Boolean(
    application.accepted === true ||
      application.acceptedAgreement === true ||
      application.agreementAcceptedAt ||
      application.acceptedAt
  );
}

function firestoreDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

export type PaymentDisplayStatus =
  | 'no_solicitado'
  | 'pendiente'
  | 'aprobado'
  | 'rechazado'
  | 'activo'
  | 'suspendido';

export function displayPaymentStatus(input: {
  status?: PaymentApplicationStatus | string | null;
  connectReady?: boolean;
  card?: boolean;
}): PaymentDisplayStatus {
  const status = String(input.status || 'draft');
  if (status === 'rejected') return 'rechazado';
  if (status === 'suspended') return 'suspendido';
  if (status === 'draft' || !status) return 'no_solicitado';
  if (input.card || (status === 'active' && input.connectReady)) return 'activo';
  if (status === 'approved') return input.connectReady ? 'activo' : 'aprobado';
  if (status === 'submitted' || status === 'under_review') return 'pendiente';
  return 'pendiente';
}

export const PAYMENT_STATUS_LABELS: Record<PaymentDisplayStatus, string> = {
  no_solicitado: 'No solicitado',
  pendiente: 'Pendiente de revisión',
  aprobado: 'Aprobado — falta activar Stripe',
  rechazado: 'Rechazado',
  activo: 'Activo',
  suspendido: 'Suspendido',
};

export interface PaymentLedgerEntry {
  id: string;
  tenantId: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  method: PaymentMethodKey;
  type: 'charge' | 'refund' | 'payout';
  currency: string;
  reference?: string;
  createdAt?: Date;
}

export interface PaymentLink {
  id: string;
  token: string;
  tenantId: string;
  amountCents: number;
  currency: string;
  description: string;
  status: 'open' | 'paid' | 'cancelled';
  invoiceId?: string;
}

export async function getPlatformPaymentFees(): Promise<PlatformPaymentFees> {
  const doc = await getDb().collection('platform_payment_fees').doc('default').get();
  if (!doc.exists) return DEFAULT_FEES;
  const data = doc.data() || {};
  return {
    cardBps: Number.isFinite(Number(data.cardBps)) ? Math.round(Number(data.cardBps)) : DEFAULT_FEES.cardBps,
    klarnaBps: Number.isFinite(Number(data.klarnaBps)) ? Math.round(Number(data.klarnaBps)) : DEFAULT_FEES.klarnaBps,
    affirmBps: Number.isFinite(Number(data.affirmBps)) ? Math.round(Number(data.affirmBps)) : DEFAULT_FEES.affirmBps,
  };
}

export async function updatePlatformPaymentFees(fees: Partial<PlatformPaymentFees>): Promise<PlatformPaymentFees> {
  const current = await getPlatformPaymentFees();
  const next = {
    cardBps: fees.cardBps ?? current.cardBps,
    klarnaBps: fees.klarnaBps ?? current.klarnaBps,
    affirmBps: fees.affirmBps ?? current.affirmBps,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await getDb().collection('platform_payment_fees').doc('default').set(next, { merge: true });
  return { cardBps: next.cardBps, klarnaBps: next.klarnaBps, affirmBps: next.affirmBps };
}

export function feeCentsForAmount(amountCents: number, bps: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  return Math.round((amount * Math.max(0, Math.round(bps))) / 10000);
}

function mapPaymentApplication(
  id: string,
  data: FirebaseFirestore.DocumentData
): PaymentApplication {
  const acceptedAt = firestoreDate(data.acceptedAt) || firestoreDate(data.agreementAcceptedAt);
  const feesSnapshot =
    data.feesSnapshot && typeof data.feesSnapshot === 'object'
      ? {
          cardBps: Number.isFinite(Number(data.feesSnapshot.cardBps))
            ? Math.round(Number(data.feesSnapshot.cardBps))
            : DEFAULT_FEES.cardBps,
          klarnaBps: Number.isFinite(Number(data.feesSnapshot.klarnaBps))
            ? Math.round(Number(data.feesSnapshot.klarnaBps))
            : DEFAULT_FEES.klarnaBps,
          affirmBps: Number.isFinite(Number(data.feesSnapshot.affirmBps))
            ? Math.round(Number(data.feesSnapshot.affirmBps))
            : DEFAULT_FEES.affirmBps,
        }
      : undefined;
  const accepted = Boolean(data.accepted === true || data.acceptedAgreement === true || acceptedAt);
  return {
    id,
    tenantId: String(data.tenantId || ''),
    userId: String(data.userId || ''),
    businessName: String(data.businessName || ''),
    status: (data.status || 'submitted') as PaymentApplicationStatus,
    notes: data.notes ? String(data.notes) : undefined,
    requestedMethods: Array.isArray(data.requestedMethods) ? data.requestedMethods : ['card'],
    accepted,
    acceptedAgreement: accepted,
    acceptedAt,
    agreementVersion: data.agreementVersion ? String(data.agreementVersion) : undefined,
    agreementAcceptedAt: acceptedAt,
    agreementText: data.agreementText ? String(data.agreementText) : undefined,
    agreementHash: data.agreementHash ? String(data.agreementHash) : undefined,
    feesSnapshot,
    createdAt: firestoreDate(data.createdAt),
    updatedAt: firestoreDate(data.updatedAt),
  };
}

export async function getLatestPaymentApplicationForTenant(
  tenantId: string
): Promise<PaymentApplication | null> {
  const snap = await getDb()
    .collection('payment_applications')
    .where('tenantId', '==', tenantId)
    .limit(50)
    .get();
  if (snap.empty) return null;
  const apps = snap.docs
    .map((doc) => mapPaymentApplication(doc.id, doc.data() || {}))
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return apps[0] || null;
}

export async function getPaymentApplicationById(
  applicationId: string
): Promise<PaymentApplication | null> {
  const snap = await getDb().collection('payment_applications').doc(applicationId).get();
  if (!snap.exists) return null;
  return mapPaymentApplication(snap.id, snap.data() || {});
}

async function requestedPaymentMethods(): Promise<PaymentMethodKey[]> {
  const [cardFlag, klarnaFlag, affirmFlag] = await Promise.all([
    isFeatureEnabled('business', 'card_payments_enabled'),
    isFeatureEnabled('business', 'klarna_enabled'),
    isFeatureEnabled('business', 'affirm_enabled'),
  ]);
  const methods: PaymentMethodKey[] = [];
  if (cardFlag !== false) methods.push('card');
  if (klarnaFlag) methods.push('klarna');
  if (affirmFlag) methods.push('affirm');
  return methods.length ? methods : ['card'];
}

async function buildAgreementAcceptanceFields() {
  const fees = await getPlatformPaymentFees();
  const agreementText = buildPaymentsAgreementText(fees);
  return {
    accepted: true,
    acceptedAgreement: true,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    agreementAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    agreementVersion: PAYMENTS_AGREEMENT_VERSION,
    agreementTitle: PAYMENTS_AGREEMENT_TITLE,
    agreementText,
    agreementHash: hashPaymentsAgreement(agreementText),
    feesSnapshot: {
      cardBps: fees.cardBps,
      klarnaBps: fees.klarnaBps,
      affirmBps: fees.affirmBps,
    },
    requestedMethods: await requestedPaymentMethods(),
    fees,
    agreementTextSnapshot: agreementText,
  };
}

export async function recordPaymentAgreementAcceptance(input: {
  tenantId: string;
  notes?: string;
}): Promise<PaymentApplication> {
  const existing = await getLatestPaymentApplicationForTenant(input.tenantId);
  if (!existing) {
    throw new Error('No hay una solicitud de cobros para aceptar el acuerdo.');
  }
  const acceptance = await buildAgreementAcceptanceFields();
  await getDb().collection('payment_applications').doc(existing.id).set(
    {
      accepted: true,
      acceptedAgreement: true,
      acceptedAt: acceptance.acceptedAt,
      agreementAcceptedAt: acceptance.agreementAcceptedAt,
      agreementVersion: acceptance.agreementVersion,
      agreementTitle: acceptance.agreementTitle,
      agreementText: acceptance.agreementText,
      agreementHash: acceptance.agreementHash,
      feesSnapshot: acceptance.feesSnapshot,
      requestedMethods: acceptance.requestedMethods,
      notes: input.notes || existing.notes || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return {
    ...existing,
    accepted: true,
    acceptedAgreement: true,
    acceptedAt: new Date(),
    agreementAcceptedAt: new Date(),
    agreementVersion: acceptance.agreementVersion,
    agreementText: acceptance.agreementText,
    agreementHash: acceptance.agreementHash,
    feesSnapshot: acceptance.feesSnapshot,
    requestedMethods: acceptance.requestedMethods,
  };
}

export async function submitPaymentApplication(input: {
  tenantId: string;
  userId: string;
  businessName: string;
  requestedMethods?: PaymentMethodKey[];
  notes?: string;
  acceptAgreement?: boolean;
}): Promise<PaymentApplication> {
  const enabled = await isFeatureEnabled('business', 'autodealers_payments_enabled');
  if (!enabled) {
    throw new Error('AutoDealers Payments no está habilitado.');
  }
  if (!input.acceptAgreement) {
    throw new Error('Debes aceptar el acuerdo y las tarifas para solicitar cobros.');
  }

  const acceptance = await buildAgreementAcceptanceFields();
  const existing = await getLatestPaymentApplicationForTenant(input.tenantId);
  if (existing && ['submitted', 'under_review', 'draft', 'approved', 'active'].includes(existing.status)) {
    if (!isPaymentAgreementAccepted(existing)) {
      await getDb().collection('payment_applications').doc(existing.id).set(
        {
          accepted: true,
          acceptedAgreement: true,
          acceptedAt: acceptance.acceptedAt,
          agreementAcceptedAt: acceptance.agreementAcceptedAt,
          agreementVersion: acceptance.agreementVersion,
          agreementTitle: acceptance.agreementTitle,
          agreementText: acceptance.agreementText,
          agreementHash: acceptance.agreementHash,
          feesSnapshot: acceptance.feesSnapshot,
          requestedMethods: acceptance.requestedMethods,
          notes: input.notes || existing.notes || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return {
        ...existing,
        accepted: true,
        acceptedAgreement: true,
        acceptedAt: new Date(),
        agreementAcceptedAt: new Date(),
        agreementVersion: acceptance.agreementVersion,
        agreementText: acceptance.agreementText,
        agreementHash: acceptance.agreementHash,
        feesSnapshot: acceptance.feesSnapshot,
        requestedMethods: acceptance.requestedMethods,
      };
    }
    return existing;
  }

  const ref = getDb().collection('payment_applications').doc();
  await ref.set({
    tenantId: input.tenantId,
    userId: input.userId,
    businessName: input.businessName,
    status: 'submitted' as PaymentApplicationStatus,
    requestedMethods: acceptance.requestedMethods,
    notes: input.notes || null,
    accepted: true,
    acceptedAgreement: true,
    acceptedAt: acceptance.acceptedAt,
    agreementAcceptedAt: acceptance.agreementAcceptedAt,
    agreementVersion: acceptance.agreementVersion,
    agreementTitle: acceptance.agreementTitle,
    agreementText: acceptance.agreementText,
    agreementHash: acceptance.agreementHash,
    feesSnapshot: acceptance.feesSnapshot,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await getDb().collection('payment_capabilities').doc(input.tenantId).set(
    {
      tenantId: input.tenantId,
      status: 'submitted',
      card: false,
      klarna: false,
      affirm: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return {
    id: ref.id,
    tenantId: input.tenantId,
    userId: input.userId,
    businessName: input.businessName,
    status: 'submitted',
    requestedMethods: acceptance.requestedMethods,
    notes: input.notes,
    accepted: true,
    acceptedAgreement: true,
    acceptedAt: new Date(),
    agreementAcceptedAt: new Date(),
    agreementVersion: acceptance.agreementVersion,
    agreementText: acceptance.agreementText,
    agreementHash: acceptance.agreementHash,
    feesSnapshot: acceptance.feesSnapshot,
  };
}

export async function listPaymentApplications(): Promise<PaymentApplication[]> {
  const snap = await getDb().collection('payment_applications').orderBy('createdAt', 'desc').limit(200).get();
  return snap.docs.map((doc) => mapPaymentApplication(doc.id, doc.data() || {}));
}

export async function reviewPaymentApplication(
  applicationId: string,
  status: PaymentApplicationStatus,
  notes?: string
): Promise<void> {
  const ref = getDb().collection('payment_applications').doc(applicationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Solicitud no encontrada');
  const data = snap.data() || {};
  const application = mapPaymentApplication(snap.id, data);
  if ((status === 'approved' || status === 'active') && !isPaymentAgreementAccepted(application)) {
    throw new Error('No se puede aprobar: el negocio no ha aceptado el acuerdo.');
  }
  await ref.set(
    {
      status,
      notes: notes ?? data.notes ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const active = status === 'approved' || status === 'active';
  const [cardFlag, klarnaFlag, affirmFlag] = await Promise.all([
    isFeatureEnabled('business', 'card_payments_enabled'),
    isFeatureEnabled('business', 'klarna_enabled'),
    isFeatureEnabled('business', 'affirm_enabled'),
  ]);
  await getDb().collection('payment_capabilities').doc(String(data.tenantId)).set(
    {
      tenantId: data.tenantId,
      status,
      card: active && cardFlag,
      klarna: active && klarnaFlag,
      affirm: active && affirmFlag,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPaymentCapability(tenantId: string): Promise<PaymentCapability> {
  const [capSnap, connect, paymentsEnabled, cardFlag, klarnaFlag, affirmFlag] = await Promise.all([
    getDb().collection('payment_capabilities').doc(tenantId).get(),
    getTenantConnectStatus(tenantId).catch(() => null),
    isFeatureEnabled('business', 'autodealers_payments_enabled'),
    isFeatureEnabled('business', 'card_payments_enabled'),
    isFeatureEnabled('business', 'klarna_enabled'),
    isFeatureEnabled('business', 'affirm_enabled'),
  ]);
  const data = capSnap.data() || {};
  const status = (data.status || 'draft') as PaymentApplicationStatus;
  const connectReady = Boolean(connect?.chargesEnabled && connect?.payoutsEnabled);
  const active = paymentsEnabled && (status === 'approved' || status === 'active') && connectReady;
  return {
    tenantId,
    status,
    connectReady,
    card: active && cardFlag,
    klarna: active && klarnaFlag,
    affirm: active && affirmFlag,
  };
}

export async function recordLedgerEntry(input: {
  tenantId: string;
  amountCents: number;
  method: PaymentMethodKey;
  type: PaymentLedgerEntry['type'];
  reference?: string;
  currency?: string;
}): Promise<PaymentLedgerEntry> {
  const amountCents = Math.round(Number(input.amountCents) || 0);
  if (!Number.isInteger(amountCents) || amountCents === 0) {
    throw new Error('El monto del ledger debe ser un entero en centavos.');
  }
  const fees = await getPlatformPaymentFees();
  const bps = input.method === 'klarna' ? fees.klarnaBps : input.method === 'affirm' ? fees.affirmBps : fees.cardBps;
  const feeCents = input.type === 'charge' ? feeCentsForAmount(amountCents, bps) : -feeCentsForAmount(Math.abs(amountCents), bps);
  const netCents = amountCents - feeCents;
  const ref = getDb().collection('payment_ledger').doc();
  await ref.set({
    tenantId: input.tenantId,
    amountCents,
    feeCents,
    netCents,
    method: input.method,
    type: input.type,
    currency: input.currency || 'usd',
    reference: input.reference || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    tenantId: input.tenantId,
    amountCents,
    feeCents,
    netCents,
    method: input.method,
    type: input.type,
    currency: input.currency || 'usd',
    reference: input.reference,
  };
}

export async function listLedgerEntries(tenantId?: string): Promise<PaymentLedgerEntry[]> {
  let q: FirebaseFirestore.Query = getDb().collection('payment_ledger').orderBy('createdAt', 'desc').limit(200);
  if (tenantId) {
    q = getDb().collection('payment_ledger').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(200);
  }
  const snap = await q.get();
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      tenantId: String(data.tenantId || ''),
      amountCents: Math.round(Number(data.amountCents) || 0),
      feeCents: Math.round(Number(data.feeCents) || 0),
      netCents: Math.round(Number(data.netCents) || 0),
      method: (data.method || 'card') as PaymentMethodKey,
      type: (data.type || 'charge') as PaymentLedgerEntry['type'],
      currency: String(data.currency || 'usd'),
      reference: data.reference ? String(data.reference) : undefined,
      createdAt: data.createdAt?.toDate?.(),
    };
  });
}

export async function createPaymentLink(input: {
  tenantId: string;
  amountCents: number;
  description: string;
  invoiceId?: string;
}): Promise<PaymentLink> {
  const capability = await getPaymentCapability(input.tenantId);
  if (!capability.card) {
    throw new Error('Este negocio no tiene cobros con tarjeta activos.');
  }
  const amountCents = Math.round(Number(input.amountCents) || 0);
  if (!(amountCents > 0)) throw new Error('El monto debe ser mayor a 0 centavos.');
  const token = randomBytes(18).toString('hex');
  const ref = getDb().collection('payment_links').doc();
  await ref.set({
    token,
    tenantId: input.tenantId,
    amountCents,
    currency: 'usd',
    description: String(input.description || 'Pago de servicio').trim(),
    status: 'open',
    invoiceId: input.invoiceId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    token,
    tenantId: input.tenantId,
    amountCents,
    currency: 'usd',
    description: String(input.description || 'Pago de servicio').trim(),
    status: 'open',
    invoiceId: input.invoiceId,
  };
}

function mapPaymentLink(id: string, data: FirebaseFirestore.DocumentData): PaymentLink {
  return {
    id,
    token: String(data.token || ''),
    tenantId: String(data.tenantId || ''),
    amountCents: Math.round(Number(data.amountCents) || 0),
    currency: String(data.currency || 'usd'),
    description: String(data.description || ''),
    status: (data.status || 'open') as PaymentLink['status'],
    invoiceId: data.invoiceId ? String(data.invoiceId) : undefined,
  };
}

export async function getPaymentLinkByToken(token: string): Promise<PaymentLink | null> {
  const snap = await getDb().collection('payment_links').where('token', '==', token).limit(1).get();
  if (snap.empty) return null;
  return mapPaymentLink(snap.docs[0].id, snap.docs[0].data() || {});
}

export async function getOpenPaymentLinkForInvoice(
  tenantId: string,
  invoiceId: string
): Promise<PaymentLink | null> {
  const snap = await getDb()
    .collection('payment_links')
    .where('invoiceId', '==', invoiceId)
    .limit(20)
    .get();
  const open = snap.docs
    .map((doc) => mapPaymentLink(doc.id, doc.data() || {}))
    .find((link) => link.tenantId === tenantId && link.status === 'open');
  return open || null;
}

export async function createOrReuseInvoicePaymentLink(input: {
  tenantId: string;
  invoiceId: string;
  amountCents: number;
  description: string;
}): Promise<PaymentLink> {
  const existing = await getOpenPaymentLinkForInvoice(input.tenantId, input.invoiceId);
  if (existing && existing.amountCents === Math.round(Number(input.amountCents) || 0)) {
    return existing;
  }
  return createPaymentLink({
    tenantId: input.tenantId,
    amountCents: input.amountCents,
    description: input.description,
    invoiceId: input.invoiceId,
  });
}

export async function createInvoicePaymentCheckout(input: {
  token: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  method?: PaymentMethodKey | string | null;
}): Promise<{ url: string; sessionId: string }> {
  const link = await getPaymentLinkByToken(input.token);
  if (!link) throw new Error('Enlace de pago no encontrado');
  if (link.status !== 'open') throw new Error('Este enlace ya no está disponible');

  const capability = await getPaymentCapability(link.tenantId);
  const available = checkoutPaymentMethodTypes(capability);
  if (!available.length) {
    throw new Error('Este negocio no tiene cobros en línea activos.');
  }

  const requested = parsePaymentMethodKey(input.method);
  const method: PaymentMethodKey = requested && available.includes(requested) ? requested : available[0];
  if (requested && !available.includes(requested)) {
    throw new Error('Ese método de pago no está disponible para este negocio.');
  }

  const connect = await getTenantConnectStatus(link.tenantId);
  if (!connect.accountId || !connect.chargesEnabled) {
    throw new Error('La cuenta Stripe del negocio todavía no puede cobrar.');
  }

  const fees = await getPlatformPaymentFees();
  const bps = method === 'klarna' ? fees.klarnaBps : method === 'affirm' ? fees.affirmBps : fees.cardBps;
  const feeCents = feeCentsForAmount(link.amountCents, bps);
  const stripe = await getStripeInstance();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: [method],
      customer_email: input.customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (link.currency || 'usd').toLowerCase(),
            unit_amount: link.amountCents,
            product_data: {
              name: link.description || 'Pago de factura',
              metadata: {
                tenantId: link.tenantId,
                invoiceId: link.invoiceId || '',
                paymentLinkId: link.id,
              },
            },
          },
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: connect.accountId,
        },
        ...(feeCents > 0 && feeCents < link.amountCents ? { application_fee_amount: feeCents } : {}),
        metadata: {
          type: 'business_invoice_payment',
          tenantId: link.tenantId,
          invoiceId: link.invoiceId || '',
          paymentLinkId: link.id,
          token: link.token,
          paymentMethod: method,
          platform: 'autodealers',
        },
      },
      metadata: {
        type: 'business_invoice_payment',
        tenantId: link.tenantId,
        invoiceId: link.invoiceId || '',
        paymentLinkId: link.id,
        token: link.token,
        paymentMethod: method,
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
  } catch (error: any) {
    const stripeMessage = String(error?.message || '').trim();
    const methodLabel = PAYMENT_METHOD_LABELS[method];
    throw new Error(
      stripeMessage
        ? `No se pudo abrir ${methodLabel}: ${stripeMessage}`
        : `Stripe no pudo iniciar el pago con ${methodLabel}.`
    );
  }

  if (!session.url) throw new Error('Stripe no devolvió URL de Checkout');
  await getDb().collection('payment_links').doc(link.id).set(
    {
      checkoutSessionId: session.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { url: session.url, sessionId: session.id };
}

export async function fulfillBusinessInvoicePayment(input: {
  tenantId: string;
  invoiceId?: string;
  paymentLinkId?: string;
  token?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  method?: PaymentMethodKey | string | null;
}): Promise<void> {
  let link: PaymentLink | null = null;
  if (input.token) {
    link = await getPaymentLinkByToken(input.token);
  } else if (input.paymentLinkId) {
    const snap = await getDb().collection('payment_links').doc(input.paymentLinkId).get();
    if (snap.exists) link = mapPaymentLink(snap.id, snap.data() || {});
  }
  if (!link) return;
  if (link.status === 'paid') return;

  await getDb().collection('payment_links').doc(link.id).set(
    {
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentIntentId: input.paymentIntentId || null,
      checkoutSessionId: input.checkoutSessionId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const invoiceId = input.invoiceId || link.invoiceId;
  if (invoiceId) {
    const invoiceRef = getDb()
      .collection('tenants')
      .doc(link.tenantId)
      .collection('business_invoices')
      .doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (invoiceSnap.exists) {
      await invoiceRef.set(
        {
          status: 'paid',
          paidCents: link.amountCents,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentLinkToken: link.token,
          paymentIntentId: input.paymentIntentId || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  await recordLedgerEntry({
    tenantId: link.tenantId,
    amountCents: link.amountCents,
    method: parsePaymentMethodKey(input.method) || 'card',
    type: 'charge',
    reference: invoiceId || link.id,
  });
}
