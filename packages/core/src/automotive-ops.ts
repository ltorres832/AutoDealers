import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';

function getDb() {
  return getFirestore();
}

export interface BusinessService {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  priceCents: number | null;
  durationMinutes: number | null;
  isActive: boolean;
  categorySlug?: string;
  photoUrls?: string[];
  videoUrls?: string[];
  specialtySlugs?: string[];
  vehicleScopeSlugs?: string[];
}

export interface BusinessProduct {
  id: string;
  tenantId: string;
  name: string;
  sku?: string;
  priceCents: number;
  stock: number | null;
  isActive: boolean;
}

export interface BusinessLineItem {
  name: string;
  qty: number;
  unitCents: number;
  totalCents: number;
}

export interface BusinessEstimate {
  id: string;
  tenantId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleLabel?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'approved' | 'declined' | 'expired';
  items: BusinessLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  viewToken?: string;
  lastEmailedAt?: Date;
  createdAt?: Date;
}

export interface BusinessInvoice {
  id: string;
  tenantId: string;
  estimateId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  items: BusinessLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  viewToken?: string;
  paymentLinkToken?: string;
  lastEmailedAt?: Date;
  createdAt?: Date;
}

export interface BusinessDocumentLink {
  token: string;
  tenantId: string;
  type: 'estimate' | 'invoice';
  documentId: string;
}

function moneySum(items: BusinessLineItem[]): { subtotalCents: number; totalCents: number } {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.totalCents || 0), 0);
  return { subtotalCents, totalCents: subtotalCents };
}

function mapItems(raw: unknown): BusinessLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const qty = Math.max(1, Number(item?.qty) || 1);
    const unitCents = Math.max(0, Math.round(Number(item?.unitCents) || 0));
    return {
      name: String(item?.name || 'Servicio'),
      qty,
      unitCents,
      totalCents: qty * unitCents,
    };
  });
}

export async function listBusinessServices(tenantId: string, activeOnly = false): Promise<BusinessService[]> {
  const snap = await getDb().collection('tenants').doc(tenantId).collection('business_services').get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        tenantId,
        name: String(data.name || ''),
        description: String(data.description || ''),
        priceCents: data.priceCents == null ? null : Math.round(Number(data.priceCents) || 0),
        durationMinutes: data.durationMinutes == null ? null : Number(data.durationMinutes) || null,
        isActive: data.isActive !== false,
        categorySlug: data.categorySlug ? String(data.categorySlug) : undefined,
        photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls.map(String).filter(Boolean) : [],
        videoUrls: Array.isArray(data.videoUrls) ? data.videoUrls.map(String).filter(Boolean) : [],
        specialtySlugs: Array.isArray(data.specialtySlugs) ? data.specialtySlugs.map(String).filter(Boolean) : [],
        vehicleScopeSlugs: Array.isArray(data.vehicleScopeSlugs) ? data.vehicleScopeSlugs.map(String).filter(Boolean) : [],
      } as BusinessService;
    })
    .filter((s) => (activeOnly ? s.isActive : true));
}

export async function upsertBusinessService(
  tenantId: string,
  input: Partial<BusinessService> & { name: string }
): Promise<BusinessService> {
  const ref = input.id
    ? getDb().collection('tenants').doc(tenantId).collection('business_services').doc(input.id)
    : getDb().collection('tenants').doc(tenantId).collection('business_services').doc();
  const payload = {
    name: input.name.trim(),
    description: String(input.description || '').trim(),
    priceCents: input.priceCents == null ? null : Math.round(Number(input.priceCents) || 0),
    durationMinutes: input.durationMinutes == null ? null : Number(input.durationMinutes) || null,
    isActive: input.isActive !== false,
    categorySlug: input.categorySlug || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(Array.isArray(input.photoUrls) ? { photoUrls: input.photoUrls.map(String).filter(Boolean) } : {}),
    ...(Array.isArray(input.videoUrls) ? { videoUrls: input.videoUrls.map(String).filter(Boolean) } : {}),
    specialtySlugs: Array.isArray(input.specialtySlugs) ? input.specialtySlugs.map(String).filter(Boolean) : [],
    vehicleScopeSlugs: Array.isArray(input.vehicleScopeSlugs) ? input.vehicleScopeSlugs.map(String).filter(Boolean) : [],
  };
  await ref.set(
    { ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return {
    id: ref.id,
    tenantId,
    name: payload.name,
    description: payload.description,
    priceCents: payload.priceCents,
    durationMinutes: payload.durationMinutes,
    isActive: payload.isActive,
    categorySlug: input.categorySlug,
    photoUrls: Array.isArray(input.photoUrls) ? input.photoUrls.map(String).filter(Boolean) : input.photoUrls,
    videoUrls: Array.isArray(input.videoUrls) ? input.videoUrls.map(String).filter(Boolean) : input.videoUrls,
    specialtySlugs: Array.isArray(input.specialtySlugs) ? input.specialtySlugs : [],
    vehicleScopeSlugs: Array.isArray(input.vehicleScopeSlugs) ? input.vehicleScopeSlugs : [],
  };
}

export async function deleteBusinessService(tenantId: string, serviceId: string): Promise<void> {
  await getDb().collection('tenants').doc(tenantId).collection('business_services').doc(serviceId).delete();
}

export async function listBusinessProducts(tenantId: string): Promise<BusinessProduct[]> {
  const snap = await getDb().collection('tenants').doc(tenantId).collection('business_products').get();
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      tenantId,
      name: String(data.name || ''),
      sku: data.sku ? String(data.sku) : undefined,
      priceCents: Math.round(Number(data.priceCents) || 0),
      stock: data.stock == null ? null : Number(data.stock),
      isActive: data.isActive !== false,
    };
  });
}

export async function upsertBusinessProduct(
  tenantId: string,
  input: Partial<BusinessProduct> & { name: string }
): Promise<BusinessProduct> {
  const ref = input.id
    ? getDb().collection('tenants').doc(tenantId).collection('business_products').doc(input.id)
    : getDb().collection('tenants').doc(tenantId).collection('business_products').doc();
  const payload = {
    name: input.name.trim(),
    sku: input.sku || null,
    priceCents: Math.round(Number(input.priceCents) || 0),
    stock: input.stock == null ? null : Number(input.stock),
    isActive: input.isActive !== false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return {
    id: ref.id,
    tenantId,
    name: payload.name,
    sku: input.sku,
    priceCents: payload.priceCents,
    stock: payload.stock,
    isActive: payload.isActive,
  };
}

export async function listBusinessEstimates(tenantId: string): Promise<BusinessEstimate[]> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('business_estimates')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    const items = mapItems(data.items);
    const totals = moneySum(items);
    return {
      id: doc.id,
      tenantId,
      customerName: String(data.customerName || ''),
      customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
      customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
      vehicleLabel: data.vehicleLabel ? String(data.vehicleLabel) : undefined,
      notes: data.notes ? String(data.notes) : undefined,
      status: (data.status || 'draft') as BusinessEstimate['status'],
      items,
      subtotalCents: totals.subtotalCents,
      taxCents: Math.round(Number(data.taxCents) || 0),
      totalCents: totals.subtotalCents + Math.round(Number(data.taxCents) || 0),
      viewToken: data.viewToken ? String(data.viewToken) : undefined,
      lastEmailedAt: data.lastEmailedAt?.toDate?.(),
      createdAt: data.createdAt?.toDate?.(),
    };
  });
}

export async function upsertBusinessEstimate(
  tenantId: string,
  input: Partial<BusinessEstimate> & { customerName: string; items: BusinessLineItem[] }
): Promise<BusinessEstimate> {
  const items = mapItems(input.items);
  const { subtotalCents } = moneySum(items);
  const taxCents = Math.max(0, Math.round(Number(input.taxCents) || 0));
  const ref = input.id
    ? getDb().collection('tenants').doc(tenantId).collection('business_estimates').doc(input.id)
    : getDb().collection('tenants').doc(tenantId).collection('business_estimates').doc();
  const existing = input.id ? await ref.get() : null;
  const viewToken =
    input.viewToken ||
    (existing?.exists && existing.data()?.viewToken) ||
    undefined;
  const payload = {
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail || null,
    customerPhone: input.customerPhone || null,
    vehicleLabel: input.vehicleLabel || null,
    notes: input.notes || null,
    status: input.status || 'draft',
    items,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return {
    id: ref.id,
    tenantId,
    ...payload,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    vehicleLabel: input.vehicleLabel,
    notes: input.notes,
    viewToken: viewToken ? String(viewToken) : undefined,
    lastEmailedAt: existing?.data()?.lastEmailedAt?.toDate?.(),
    status: (input.status || 'draft') as BusinessEstimate['status'],
  };
}

export async function listBusinessInvoices(tenantId: string): Promise<BusinessInvoice[]> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('business_invoices')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    const items = mapItems(data.items);
    const { subtotalCents } = moneySum(items);
    const taxCents = Math.round(Number(data.taxCents) || 0);
    return {
      id: doc.id,
      tenantId,
      estimateId: data.estimateId ? String(data.estimateId) : undefined,
      customerName: String(data.customerName || ''),
      customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
      customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
      status: (data.status || 'draft') as BusinessInvoice['status'],
      items,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      paidCents: Math.round(Number(data.paidCents) || 0),
      viewToken: data.viewToken ? String(data.viewToken) : undefined,
      paymentLinkToken: data.paymentLinkToken ? String(data.paymentLinkToken) : undefined,
      lastEmailedAt: data.lastEmailedAt?.toDate?.(),
      createdAt: data.createdAt?.toDate?.(),
    };
  });
}

export async function upsertBusinessInvoice(
  tenantId: string,
  input: Partial<BusinessInvoice> & { customerName: string; items: BusinessLineItem[] }
): Promise<BusinessInvoice> {
  const items = mapItems(input.items);
  const { subtotalCents } = moneySum(items);
  const taxCents = Math.max(0, Math.round(Number(input.taxCents) || 0));
  const ref = input.id
    ? getDb().collection('tenants').doc(tenantId).collection('business_invoices').doc(input.id)
    : getDb().collection('tenants').doc(tenantId).collection('business_invoices').doc();
  const existing = input.id ? await ref.get() : null;
  const viewToken =
    input.viewToken ||
    (existing?.exists && existing.data()?.viewToken) ||
    undefined;
  const paymentLinkToken =
    input.paymentLinkToken ||
    (existing?.exists && existing.data()?.paymentLinkToken) ||
    undefined;
  const payload = {
    estimateId: input.estimateId || null,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail || null,
    customerPhone: input.customerPhone || null,
    status: input.status || 'draft',
    items,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    paidCents: Math.max(0, Math.round(Number(input.paidCents) || 0)),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return {
    id: ref.id,
    tenantId,
    estimateId: input.estimateId,
    customerName: payload.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    status: (input.status || 'draft') as BusinessInvoice['status'],
    items,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    paidCents: payload.paidCents,
    viewToken: viewToken ? String(viewToken) : undefined,
    paymentLinkToken: paymentLinkToken ? String(paymentLinkToken) : undefined,
    lastEmailedAt: existing?.data()?.lastEmailedAt?.toDate?.(),
  };
}

export async function convertBusinessEstimateToInvoice(
  tenantId: string,
  estimateId: string
): Promise<BusinessInvoice> {
  const estimates = await listBusinessEstimates(tenantId);
  const estimate = estimates.find((item) => item.id === estimateId);
  if (!estimate) throw new Error('Estimado no encontrado');
  const invoices = await listBusinessInvoices(tenantId);
  const existing = invoices.find((item) => item.estimateId === estimateId);
  if (existing) return existing;
  const invoice = await upsertBusinessInvoice(tenantId, {
    estimateId: estimate.id,
    customerName: estimate.customerName,
    customerEmail: estimate.customerEmail,
    customerPhone: estimate.customerPhone,
    items: estimate.items,
    taxCents: estimate.taxCents,
    status: 'sent',
  });
  await upsertBusinessEstimate(tenantId, {
    id: estimate.id,
    customerName: estimate.customerName,
    customerEmail: estimate.customerEmail,
    customerPhone: estimate.customerPhone,
    vehicleLabel: estimate.vehicleLabel,
    notes: estimate.notes,
    items: estimate.items,
    taxCents: estimate.taxCents,
    status: 'approved',
  });
  return invoice;
}

export async function getBusinessEstimateById(
  tenantId: string,
  estimateId: string
): Promise<BusinessEstimate | null> {
  const estimates = await listBusinessEstimates(tenantId);
  return estimates.find((item) => item.id === estimateId) || null;
}

export async function getBusinessInvoiceById(
  tenantId: string,
  invoiceId: string
): Promise<BusinessInvoice | null> {
  const invoices = await listBusinessInvoices(tenantId);
  return invoices.find((item) => item.id === invoiceId) || null;
}

export async function ensureBusinessDocumentLink(input: {
  tenantId: string;
  type: 'estimate' | 'invoice';
  documentId: string;
  existingToken?: string;
}): Promise<string> {
  const token = input.existingToken || randomBytes(18).toString('hex');
  await getDb().collection('business_document_links').doc(token).set(
    {
      token,
      tenantId: input.tenantId,
      type: input.type,
      documentId: input.documentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const collection = input.type === 'estimate' ? 'business_estimates' : 'business_invoices';
  await getDb()
    .collection('tenants')
    .doc(input.tenantId)
    .collection(collection)
    .doc(input.documentId)
    .set({ viewToken: token, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return token;
}

export async function getBusinessDocumentLink(token: string): Promise<BusinessDocumentLink | null> {
  const snap = await getDb().collection('business_document_links').doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return {
    token: String(data.token || token),
    tenantId: String(data.tenantId || ''),
    type: data.type === 'invoice' ? 'invoice' : 'estimate',
    documentId: String(data.documentId || ''),
  };
}

export async function markBusinessDocumentEmailed(
  tenantId: string,
  type: 'estimate' | 'invoice',
  documentId: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const collection = type === 'estimate' ? 'business_estimates' : 'business_invoices';
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(collection)
    .doc(documentId)
    .set(
      {
        lastEmailedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: extra?.status || (type === 'estimate' ? 'sent' : 'sent'),
        ...(extra || {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export function verticalFieldsForModule(moduleKey: string): Array<{ key: string; label: string }> {
  switch (moduleKey) {
    case 'tires':
      return [
        { key: 'brands', label: 'Marcas de gomas' },
        { key: 'sizes', label: 'Medidas que maneja' },
        { key: 'rotationIncluded', label: 'Incluye rotación' },
      ];
    case 'detailing':
      return [
        { key: 'packages', label: 'Paquetes' },
        { key: 'mobileAvailable', label: 'Servicio a domicilio' },
      ];
    case 'body':
      return [
        { key: 'insuranceWork', label: 'Trabaja con seguros' },
        { key: 'paintBooth', label: 'Cabina de pintura' },
      ];
    case 'tint':
      return [
        { key: 'filmBrands', label: 'Marcas de film' },
        { key: 'ppfAvailable', label: 'Ofrece PPF' },
      ];
    case 'parts':
      return [
        { key: 'newUsed', label: 'Nuevo / usado' },
        { key: 'delivery', label: 'Entrega' },
      ];
    case 'towing':
      return [
        { key: 'coverageArea', label: 'Área de cobertura' },
        { key: 'flatbed', label: 'Plataforma' },
      ];
    case 'mechanic':
      return [
        { key: 'specialties', label: 'Especialidades' },
        { key: 'makes', label: 'Marcas que atiende' },
      ];
    default:
      return [{ key: 'notes', label: 'Notas del servicio' }];
  }
}
