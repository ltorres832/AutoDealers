// Finanzas del dealer: AR, cobros, caja/diario, estado de cuenta (sin GL)

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

function tenantRef(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId);
}

export type InvoiceSource = 'sale' | 'repair_order' | 'manual' | 'estimate';
export type InvoiceStatus = 'draft' | 'open' | 'partial' | 'paid' | 'void';
export type InvoiceLineItem = {
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
  kind?: 'labor' | 'parts' | 'other';
};

export interface ArInvoice {
  id: string;
  tenantId: string;
  number: string;
  status: InvoiceStatus;
  source: InvoiceSource;
  sourceId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  leadId?: string;
  estimateId?: string;
  items?: InvoiceLineItem[];
  description?: string;
  subtotal: number;
  tax: number;
  total: number;
  balance: number;
  currency: string;
  dueDate?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArPayment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'card' | 'ach' | 'other';
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface CashEntry {
  id: string;
  tenantId: string;
  type: 'in' | 'out';
  amount: number;
  category: string;
  description?: string;
  invoiceId?: string;
  paymentId?: string;
  createdBy: string;
  createdAt: Date;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toDate(v: any): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function normalizeInvoice(id: string, data: any): ArInvoice {
  return {
    id,
    tenantId: data.tenantId,
    number: data.number,
    status: data.status || 'open',
    source: data.source || 'manual',
    sourceId: data.sourceId,
    customerName: data.customerName || '',
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    leadId: data.leadId,
    estimateId: data.estimateId,
    items: Array.isArray(data.items) ? data.items : [],
    description: data.description,
    subtotal: Number(data.subtotal || 0),
    tax: Number(data.tax || 0),
    total: Number(data.total || 0),
    balance: Number(data.balance ?? data.total ?? 0),
    currency: data.currency || 'USD',
    dueDate: data.dueDate,
    createdBy: data.createdBy || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

export async function createInvoice(
  input: Omit<ArInvoice, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'balance' | 'status'> & {
    status?: InvoiceStatus;
    number?: string;
  }
): Promise<ArInvoice> {
  const ref = tenantRef(input.tenantId).collection('ar_invoices').doc();
  const year = new Date().getFullYear();
  const number = input.number || `INV-${year}-${ref.id.slice(0, 6).toUpperCase()}`;
  const total = round2(Number(input.total));
  const row: ArInvoice = {
    id: ref.id,
    tenantId: input.tenantId,
    number,
    status: input.status || 'open',
    source: input.source,
    sourceId: input.sourceId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    leadId: input.leadId,
    estimateId: input.estimateId,
    items: input.items || [],
    description: input.description,
    subtotal: round2(Number(input.subtotal || total)),
    tax: round2(Number(input.tax || 0)),
    total,
    balance: total,
    currency: input.currency || 'USD',
    dueDate: input.dueDate,
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ref.set({
    ...row,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function listInvoices(
  tenantId: string,
  opts?: { status?: string; limit?: number }
): Promise<ArInvoice[]> {
  let q: any = tenantRef(tenantId).collection('ar_invoices');
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d: any) => normalizeInvoice(d.id, d.data()));
  rows.sort((a: ArInvoice, b: ArInvoice) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return rows;
}

export async function getInvoice(tenantId: string, id: string): Promise<ArInvoice | null> {
  const snap = await tenantRef(tenantId).collection('ar_invoices').doc(id).get();
  if (!snap.exists) return null;
  return normalizeInvoice(snap.id, snap.data());
}

export async function updateInvoice(
  tenantId: string,
  id: string,
  patch: Partial<Pick<ArInvoice, 'status' | 'customerName' | 'customerEmail' | 'customerPhone' | 'description' | 'dueDate' | 'items' | 'subtotal' | 'tax' | 'total'>>
): Promise<ArInvoice> {
  const current = await getInvoice(tenantId, id);
  if (!current) throw new Error('Factura no encontrada');
  const next: ArInvoice = { ...current, ...patch, updatedAt: new Date() };
  if (patch.total != null) {
    const paid = round2(current.total - current.balance);
    next.balance = Math.max(0, round2(Number(patch.total) - paid));
    if (next.status !== 'void') {
      next.status = next.balance <= 0 ? 'paid' : paid > 0 ? 'partial' : next.status === 'draft' ? 'draft' : 'open';
    }
  }
  const { id: _i, createdAt: _c, ...toSave } = next;
  await tenantRef(tenantId)
    .collection('ar_invoices')
    .doc(id)
    .set({ ...toSave, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
  return next;
}

export async function recordPayment(input: {
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: ArPayment['method'];
  reference?: string;
  notes?: string;
  createdBy: string;
  postToCash?: boolean;
}): Promise<{ payment: ArPayment; invoice: ArInvoice }> {
  const invoice = await getInvoice(input.tenantId, input.invoiceId);
  if (!invoice) throw new Error('Factura no encontrada');
  if (invoice.status === 'void' || invoice.status === 'paid') {
    throw new Error('La factura no admite cobros');
  }
  const amount = round2(Number(input.amount));
  if (amount <= 0 || amount > invoice.balance + 0.001) {
    throw new Error('Monto de cobro inválido');
  }

  const payRef = tenantRef(input.tenantId).collection('ar_payments').doc();
  const payment: ArPayment = {
    id: payRef.id,
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    amount,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    createdBy: input.createdBy,
    createdAt: new Date(),
  };
  await payRef.set({
    ...payment,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  });

  const balance = round2(invoice.balance - amount);
  const status: InvoiceStatus = balance <= 0 ? 'paid' : 'partial';
  await tenantRef(input.tenantId)
    .collection('ar_invoices')
    .doc(input.invoiceId)
    .set(
      {
        balance: Math.max(0, balance),
        status,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );

  if (input.postToCash !== false) {
    await addCashEntry({
      tenantId: input.tenantId,
      type: 'in',
      amount,
      category: 'ar_payment',
      description: `Cobro ${invoice.number}`,
      invoiceId: invoice.id,
      paymentId: payment.id,
      createdBy: input.createdBy,
    });
  }

  const updated = (await getInvoice(input.tenantId, input.invoiceId))!;
  return { payment, invoice: updated };
}

export async function addCashEntry(
  input: Omit<CashEntry, 'id' | 'createdAt'>
): Promise<CashEntry> {
  const ref = tenantRef(input.tenantId).collection('cash_journal').doc();
  const row: CashEntry = {
    id: ref.id,
    ...input,
    amount: round2(Number(input.amount)),
    createdAt: new Date(),
  };
  await ref.set({
    ...row,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function listCashEntries(
  tenantId: string,
  opts?: { limit?: number }
): Promise<CashEntry[]> {
  const snap = await tenantRef(tenantId)
    .collection('cash_journal')
    .limit(opts?.limit || 100)
    .get();
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      type: data.type,
      amount: Number(data.amount || 0),
      category: data.category || '',
      description: data.description,
      invoiceId: data.invoiceId,
      paymentId: data.paymentId,
      createdBy: data.createdBy || '',
      createdAt: toDate(data.createdAt) || new Date(),
    } as CashEntry;
  });
  rows.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return rows;
}

export async function getCustomerStatement(
  tenantId: string,
  customerKey: string
): Promise<{
  customer: string;
  invoices: ArInvoice[];
  openBalance: number;
  paidTotal: number;
}> {
  const key = customerKey.trim().toLowerCase();
  const all = await listInvoices(tenantId, { limit: 300 });
  const invoices = all.filter(
    (i) =>
      i.customerName.toLowerCase().includes(key) ||
      (i.customerEmail || '').toLowerCase() === key ||
      (i.customerPhone || '').replace(/\D/g, '') === key.replace(/\D/g, '')
  );
  const openBalance = round2(
    invoices.filter((i) => i.status === 'open' || i.status === 'partial').reduce((s, i) => s + i.balance, 0)
  );
  const paidTotal = round2(
    invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  );
  return {
    customer: customerKey,
    invoices,
    openBalance,
    paidTotal,
  };
}

/** Crea factura AR desde una venta completada */
export async function invoiceFromSale(
  tenantId: string,
  sale: {
    id: string;
    salePrice?: number;
    total?: number;
    buyer?: { fullName?: string; email?: string; phone?: string };
    leadId?: string;
  },
  createdBy: string
): Promise<ArInvoice> {
  const total = round2(Number(sale.total ?? sale.salePrice ?? 0));
  return createInvoice({
    tenantId,
    source: 'sale',
    sourceId: sale.id,
    customerName: sale.buyer?.fullName || 'Cliente',
    customerEmail: sale.buyer?.email,
    customerPhone: sale.buyer?.phone,
    leadId: sale.leadId,
    description: `Venta ${sale.id}`,
    subtotal: total,
    tax: 0,
    total,
    currency: 'USD',
    createdBy,
  });
}

/** Crea factura AR desde RO entregada */
export async function invoiceFromRepairOrder(
  tenantId: string,
  ro: {
    id: string;
    number: string;
    total: number;
    tax?: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    leadId?: string;
  },
  createdBy: string
): Promise<ArInvoice> {
  return createInvoice({
    tenantId,
    source: 'repair_order',
    sourceId: ro.id,
    customerName: ro.customerName,
    customerEmail: ro.customerEmail,
    customerPhone: ro.customerPhone,
    leadId: ro.leadId,
    description: `Servicio ${ro.number}`,
    subtotal: round2(ro.total - Number(ro.tax || 0)),
    tax: round2(Number(ro.tax || 0)),
    total: round2(ro.total),
    currency: 'USD',
    createdBy,
  });
}
