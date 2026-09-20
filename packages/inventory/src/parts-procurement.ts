// Suplidores y órdenes de compra (PO) para piezas

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { adjustPartStock, getPart, updatePart } from './parts';

function getDb() {
  return getFirestore();
}

function tenantRef(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId);
}

export interface PartsSupplier {
  id: string;
  tenantId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  accountNumber?: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partial'
  | 'received'
  | 'cancelled';

export interface PurchaseOrderLine {
  id: string;
  partId?: string;
  sku: string;
  description: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName?: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  orderedAt?: Date | null;
  receivedAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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

function normalizeSupplier(id: string, data: any): PartsSupplier {
  return {
    id,
    tenantId: data.tenantId,
    name: data.name || '',
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    accountNumber: data.accountNumber,
    notes: data.notes,
    active: data.active !== false,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

function normalizePo(id: string, data: any): PurchaseOrder {
  return {
    id,
    tenantId: data.tenantId,
    number: data.number || id.slice(0, 8).toUpperCase(),
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    status: data.status || 'draft',
    lines: Array.isArray(data.lines) ? data.lines : [],
    subtotal: Number(data.subtotal || 0),
    tax: Number(data.tax || 0),
    total: Number(data.total || 0),
    notes: data.notes,
    orderedAt: toDate(data.orderedAt) || null,
    receivedAt: toDate(data.receivedAt) || null,
    createdBy: data.createdBy || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

export async function createSupplier(
  input: Omit<PartsSupplier, 'id' | 'createdAt' | 'updatedAt' | 'active'> & { active?: boolean }
): Promise<PartsSupplier> {
  if (!input.name?.trim()) throw new Error('Nombre del suplidor requerido');
  const ref = tenantRef(input.tenantId).collection('parts_suppliers').doc();
  const row: PartsSupplier = {
    id: ref.id,
    tenantId: input.tenantId,
    name: input.name.trim(),
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    accountNumber: input.accountNumber,
    notes: input.notes,
    active: input.active !== false,
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

export async function listSuppliers(tenantId: string): Promise<PartsSupplier[]> {
  const snap = await tenantRef(tenantId).collection('parts_suppliers').limit(200).get();
  return snap.docs
    .map((d) => normalizeSupplier(d.id, d.data()))
    .filter((s) => s.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateSupplier(
  tenantId: string,
  id: string,
  patch: Partial<PartsSupplier>
): Promise<void> {
  const { id: _i, tenantId: _t, createdAt: _c, ...rest } = patch as any;
  await tenantRef(tenantId)
    .collection('parts_suppliers')
    .doc(id)
    .set({ ...rest, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
}

function computePoTotals(lines: PurchaseOrderLine[], tax: number) {
  const subtotal = round2(lines.reduce((s, l) => s + Number(l.amount || 0), 0));
  const t = round2(Number(tax || 0));
  return { subtotal, tax: t, total: round2(subtotal + t) };
}

export async function createPurchaseOrder(input: {
  tenantId: string;
  supplierId: string;
  lines: Array<{
    partId?: string;
    sku: string;
    description: string;
    qtyOrdered: number;
    unitCost: number;
  }>;
  tax?: number;
  notes?: string;
  createdBy: string;
  status?: PurchaseOrderStatus;
}): Promise<PurchaseOrder> {
  if (!input.supplierId) throw new Error('Suplidor requerido');
  if (!input.lines?.length) throw new Error('Agrega al menos una línea');

  let supplierName: string | undefined;
  try {
    const s = await tenantRef(input.tenantId)
      .collection('parts_suppliers')
      .doc(input.supplierId)
      .get();
    supplierName = s.data()?.name;
  } catch {
    /* ignore */
  }

  const lines: PurchaseOrderLine[] = input.lines.map((l, i) => {
    const qty = Math.max(0, Number(l.qtyOrdered || 0));
    const unitCost = Number(l.unitCost || 0);
    return {
      id: `line_${i + 1}`,
      partId: l.partId,
      sku: String(l.sku || '').toUpperCase(),
      description: l.description,
      qtyOrdered: qty,
      qtyReceived: 0,
      unitCost,
      amount: round2(qty * unitCost),
    };
  });

  const totals = computePoTotals(lines, input.tax || 0);
  const ref = tenantRef(input.tenantId).collection('purchase_orders').doc();
  const year = new Date().getFullYear();
  const number = `PO-${year}-${ref.id.slice(0, 6).toUpperCase()}`;
  const status = input.status || 'draft';
  const row: PurchaseOrder = {
    id: ref.id,
    tenantId: input.tenantId,
    number,
    supplierId: input.supplierId,
    supplierName,
    status,
    lines,
    ...totals,
    notes: input.notes,
    orderedAt: status === 'ordered' ? new Date() : null,
    receivedAt: null,
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

export async function listPurchaseOrders(
  tenantId: string,
  opts?: { status?: PurchaseOrderStatus; limit?: number }
): Promise<PurchaseOrder[]> {
  let q: any = tenantRef(tenantId).collection('purchase_orders');
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d: any) => normalizePo(d.id, d.data()));
  rows.sort(
    (a: PurchaseOrder, b: PurchaseOrder) =>
      (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
  );
  return rows;
}

export async function getPurchaseOrder(
  tenantId: string,
  id: string
): Promise<PurchaseOrder | null> {
  const snap = await tenantRef(tenantId).collection('purchase_orders').doc(id).get();
  if (!snap.exists) return null;
  return normalizePo(snap.id, snap.data());
}

export function purchaseOrderPlainText(po: PurchaseOrder): string {
  const lines = [
    `ORDEN DE COMPRA ${po.number}`,
    `Estado: ${po.status}`,
    `Suplidor: ${po.supplierName || po.supplierId}`,
    po.orderedAt ? `Fecha orden: ${new Date(po.orderedAt).toLocaleString('es-PR')}` : '',
    '',
    'Líneas:',
    ...po.lines.map(
      (l) =>
        `- ${l.sku} ${l.description}: ${l.qtyOrdered} x $${Number(l.unitCost).toFixed(2)} = $${Number(l.amount).toFixed(2)} (recibido ${l.qtyReceived})`
    ),
    '',
    `Subtotal: $${Number(po.subtotal).toFixed(2)}`,
    `ITBMS/Tax: $${Number(po.tax).toFixed(2)}`,
    `Total: $${Number(po.total).toFixed(2)}`,
    po.notes ? `\nNotas: ${po.notes}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function purchaseOrderEmailHtml(po: PurchaseOrder, dealerName: string): string {
  const rows = po.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.sku}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.description}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${l.qtyOrdered}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(l.unitCost).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(l.amount).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <h1 style="margin:0 0 8px;font-size:22px;">Orden de compra ${po.number}</h1>
  <p style="margin:0 0 16px;color:#4b5563;">De: <strong>${dealerName}</strong><br/>Para: <strong>${po.supplierName || po.supplierId}</strong></p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th align="left" style="padding:8px;">SKU</th>
        <th align="left" style="padding:8px;">Descripción</th>
        <th align="right" style="padding:8px;">Cant.</th>
        <th align="right" style="padding:8px;">Costo</th>
        <th align="right" style="padding:8px;">Importe</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin:16px 0 0;text-align:right;font-size:15px;">
    Subtotal: $${Number(po.subtotal).toFixed(2)}<br/>
    Tax: $${Number(po.tax).toFixed(2)}<br/>
    <strong>Total: $${Number(po.total).toFixed(2)}</strong>
  </p>
  ${po.notes ? `<p style="margin:16px 0 0;color:#4b5563;">Notas: ${po.notes}</p>` : ''}
  <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Generado desde AutoDealers Online</p>
  </body></html>`;
}

export async function updatePurchaseOrderStatus(
  tenantId: string,
  id: string,
  status: PurchaseOrderStatus
): Promise<PurchaseOrder> {
  const po = await getPurchaseOrder(tenantId, id);
  if (!po) throw new Error('PO no encontrada');
  const patch: any = {
    status,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };
  if (status === 'ordered' && !po.orderedAt) patch.orderedAt = new Date();
  await tenantRef(tenantId).collection('purchase_orders').doc(id).set(patch, { merge: true });
  return (await getPurchaseOrder(tenantId, id))!;
}

/**
 * Recibe mercancía: incrementa stock de piezas y actualiza qtyReceived en líneas.
 * receipts: { lineId, qty }[]
 */
export async function receivePurchaseOrder(
  tenantId: string,
  poId: string,
  receipts: Array<{ lineId: string; qty: number }>
): Promise<PurchaseOrder> {
  const po = await getPurchaseOrder(tenantId, poId);
  if (!po) throw new Error('PO no encontrada');
  if (po.status === 'cancelled' || po.status === 'received') {
    throw new Error('Esta PO no admite más recepciones');
  }

  const lines = [...po.lines];
  for (const r of receipts) {
    const line = lines.find((l) => l.id === r.lineId);
    if (!line) continue;
    const qty = Math.max(0, Number(r.qty || 0));
    const remaining = line.qtyOrdered - line.qtyReceived;
    const take = Math.min(qty, remaining);
    if (take <= 0) continue;
    line.qtyReceived += take;

    if (line.partId) {
      await adjustPartStock(tenantId, line.partId, take, `po_receive:${po.number}`);
      try {
        const part = await getPart(tenantId, line.partId);
        if (part && line.unitCost > 0) {
          await updatePart(tenantId, line.partId, { cost: line.unitCost });
        }
      } catch {
        /* ignore */
      }
    }
  }

  const allReceived = lines.every((l) => l.qtyReceived >= l.qtyOrdered);
  const anyReceived = lines.some((l) => l.qtyReceived > 0);
  const status: PurchaseOrderStatus = allReceived
    ? 'received'
    : anyReceived
      ? 'partial'
      : po.status === 'draft'
        ? 'ordered'
        : po.status;

  await tenantRef(tenantId)
    .collection('purchase_orders')
    .doc(poId)
    .set(
      {
        lines,
        status,
        receivedAt: allReceived ? new Date() : po.receivedAt,
        orderedAt: po.orderedAt || new Date(),
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );

  return (await getPurchaseOrder(tenantId, poId))!;
}
