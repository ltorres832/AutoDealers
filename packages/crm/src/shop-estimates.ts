import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { createRepairOrder, type RoLaborLine, type RoPartLine } from './repair-orders';
import { createInvoice, type InvoiceLineItem } from './dealer-finance';

function getDb() {
  return getFirestore();
}

function col(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('estimates');
}

export type ShopEstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface ShopEstimate {
  id: string;
  tenantId: string;
  number: string;
  status: ShopEstimateStatus;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  leadId?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  vin?: string;
  plate?: string;
  labor: RoLaborLine[];
  parts: RoPartLine[];
  laborTotal: number;
  partsTotal: number;
  tax: number;
  total: number;
  notes?: string;
  repairOrderId?: string;
  invoiceId?: string;
  photos?: string[];
  videos?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function totals(labor: RoLaborLine[], parts: RoPartLine[], tax: number) {
  const laborTotal = round2((labor || []).reduce((s, l) => s + Number(l.amount || 0), 0));
  const partsTotal = round2((parts || []).reduce((s, p) => s + Number(p.amount || 0), 0));
  const taxN = round2(Number(tax || 0));
  return { laborTotal, partsTotal, tax: taxN, total: round2(laborTotal + partsTotal + taxN) };
}

function normalize(id: string, data: Record<string, unknown>): ShopEstimate {
  const labor = Array.isArray(data.labor) ? (data.labor as RoLaborLine[]) : [];
  const parts = Array.isArray(data.parts) ? (data.parts as RoPartLine[]) : [];
  const t = totals(labor, parts, Number(data.tax || 0));
  return {
    id,
    tenantId: String(data.tenantId || ''),
    number: String(data.number || id.slice(0, 8).toUpperCase()),
    status: (data.status as ShopEstimateStatus) || 'draft',
    customerName: String(data.customerName || ''),
    customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
    customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
    leadId: data.leadId ? String(data.leadId) : undefined,
    vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
    vehicleLabel: data.vehicleLabel ? String(data.vehicleLabel) : undefined,
    vin: data.vin ? String(data.vin) : undefined,
    plate: data.plate ? String(data.plate) : undefined,
    labor,
    parts,
    ...t,
    notes: data.notes ? String(data.notes) : undefined,
    repairOrderId: data.repairOrderId ? String(data.repairOrderId) : undefined,
    invoiceId: data.invoiceId ? String(data.invoiceId) : undefined,
    photos: Array.isArray(data.photos) ? (data.photos as string[]).filter(Boolean) : [],
    videos: Array.isArray(data.videos) ? (data.videos as string[]).filter(Boolean) : [],
    createdBy: String(data.createdBy || ''),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

async function nextNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await col(tenantId).where('numberPrefix', '==', `EST-${year}`).limit(500).get();
  return `EST-${year}-${String(snap.size + 1).padStart(4, '0')}`;
}

export async function createShopEstimate(
  input: Omit<ShopEstimate, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'laborTotal' | 'partsTotal' | 'total'> & {
    number?: string;
  }
): Promise<ShopEstimate> {
  const ref = col(input.tenantId).doc();
  const year = new Date().getFullYear();
  const number = input.number || (await nextNumber(input.tenantId));
  const t = totals(input.labor || [], input.parts || [], input.tax);
  const row: ShopEstimate = {
    id: ref.id,
    tenantId: input.tenantId,
    number,
    status: input.status || 'draft',
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    leadId: input.leadId,
    vehicleId: input.vehicleId,
    vehicleLabel: input.vehicleLabel,
    vin: input.vin,
    plate: input.plate,
    labor: input.labor || [],
    parts: input.parts || [],
    ...t,
    notes: input.notes,
    photos: input.photos || [],
    videos: input.videos || [],
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ref.set({
    ...row,
    numberPrefix: `EST-${year}`,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function getShopEstimate(tenantId: string, id: string): Promise<ShopEstimate | null> {
  const snap = await col(tenantId).doc(id).get();
  if (!snap.exists) return null;
  return normalize(snap.id, snap.data() || {});
}

export async function listShopEstimates(tenantId: string, opts?: { status?: ShopEstimateStatus; limit?: number }) {
  let q: any = col(tenantId);
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d) => normalize(d.id, d.data() || {}));
  rows.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  return rows;
}

export async function updateShopEstimate(
  tenantId: string,
  id: string,
  patch: Partial<ShopEstimate>
): Promise<ShopEstimate> {
  const current = await getShopEstimate(tenantId, id);
  if (!current) throw new Error('Estimado no encontrado');
  const merged: ShopEstimate = {
    ...current,
    ...patch,
    labor: patch.labor ?? current.labor,
    parts: patch.parts ?? current.parts,
    updatedAt: new Date(),
  };
  Object.assign(merged, totals(merged.labor, merged.parts, merged.tax));
  const { id: _i, createdAt: _c, ...toSave } = merged;
  await col(tenantId)
    .doc(id)
    .set({ ...toSave, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
  return merged;
}

export function shopEstimatePlainText(est: ShopEstimate): string {
  return [
    `Estimado ${est.number}`,
    `Estado: ${est.status}`,
    `Cliente: ${est.customerName}${est.customerPhone ? ` · ${est.customerPhone}` : ''}`,
    `Vehículo: ${est.vehicleLabel || '—'} ${est.plate ? `· ${est.plate}` : ''}`,
    '',
    'Mano de obra:',
    ...est.labor.map((l) => `- ${l.description}: ${l.hours}h × $${l.rate} = $${l.amount}`),
    `Subtotal labor: $${est.laborTotal}`,
    '',
    'Piezas:',
    ...est.parts.map((p) => `- ${p.sku || ''} ${p.description}: ${p.qty} × $${p.unitPrice} = $${p.amount}`),
    `Subtotal piezas: $${est.partsTotal}`,
    `Impuesto: $${est.tax}`,
    `TOTAL: $${est.total}`,
    '',
    `Notas: ${est.notes || '—'}`,
  ].join('\n');
}

export async function convertEstimateToRepairOrder(
  tenantId: string,
  estimateId: string,
  createdBy: string
) {
  const est = await getShopEstimate(tenantId, estimateId);
  if (!est) throw new Error('Estimado no encontrado');
  const order = await createRepairOrder({
    tenantId,
    status: 'intake',
    customerName: est.customerName,
    customerPhone: est.customerPhone,
    customerEmail: est.customerEmail,
    leadId: est.leadId,
    vehicleId: est.vehicleId,
    vehicleLabel: est.vehicleLabel,
    vin: est.vin,
    plate: est.plate,
    complaints: [],
    labor: est.labor,
    parts: est.parts,
    tax: est.tax,
    notes: est.notes,
    photos: est.photos,
    videos: est.videos,
    estimateId: est.id,
    advisorId: createdBy,
    createdBy,
  });
  await updateShopEstimate(tenantId, estimateId, { status: 'approved', repairOrderId: order.id });
  return order;
}

export async function convertEstimateToInvoice(tenantId: string, estimateId: string, createdBy: string) {
  const est = await getShopEstimate(tenantId, estimateId);
  if (!est) throw new Error('Estimado no encontrado');
  const items: InvoiceLineItem[] = [
    ...est.labor.map((l) => ({
      name: l.description,
      qty: Number(l.hours || 1),
      unitPrice: Number(l.rate || 0),
      amount: Number(l.amount || 0),
      kind: 'labor' as const,
    })),
    ...est.parts.map((p) => ({
      name: p.description,
      qty: Number(p.qty || 1),
      unitPrice: Number(p.unitPrice || 0),
      amount: Number(p.amount || 0),
      kind: 'parts' as const,
    })),
  ];
  const invoice = await createInvoice({
    tenantId,
    source: 'estimate',
    sourceId: est.id,
    estimateId: est.id,
    customerName: est.customerName,
    customerEmail: est.customerEmail,
    customerPhone: est.customerPhone,
    leadId: est.leadId,
    description: `Estimado ${est.number}`,
    items,
    subtotal: round2(est.laborTotal + est.partsTotal),
    tax: est.tax,
    total: est.total,
    currency: 'USD',
    createdBy,
  });
  await updateShopEstimate(tenantId, estimateId, { invoiceId: invoice.id, status: 'approved' });
  return invoice;
}

export async function createEstimateFromRepairOrder(
  tenantId: string,
  ro: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    leadId?: string;
    vehicleId?: string;
    vehicleLabel?: string;
    vin?: string;
    plate?: string;
    labor: RoLaborLine[];
    parts: RoPartLine[];
    tax: number;
    notes?: string;
    photos?: string[];
    videos?: string[];
  },
  createdBy: string
) {
  return createShopEstimate({
    tenantId,
    status: 'draft',
    customerName: ro.customerName,
    customerPhone: ro.customerPhone,
    customerEmail: ro.customerEmail,
    leadId: ro.leadId,
    vehicleId: ro.vehicleId,
    vehicleLabel: ro.vehicleLabel,
    vin: ro.vin,
    plate: ro.plate,
    labor: ro.labor || [],
    parts: ro.parts || [],
    tax: Number(ro.tax || 0),
    notes: ro.notes,
    photos: ro.photos,
    videos: ro.videos,
    createdBy,
  });
}
