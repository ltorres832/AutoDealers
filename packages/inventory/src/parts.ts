// Catálogo de piezas (SKU / stock) — Fase 3

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

function col(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('parts');
}

export interface PartItem {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  qtyOnHand: number;
  qtyReserved: number;
  cost: number;
  price: number;
  location?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toDate(v: any): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function normalize(id: string, data: any): PartItem {
  return {
    id,
    tenantId: data.tenantId,
    sku: data.sku || '',
    name: data.name || '',
    description: data.description,
    qtyOnHand: Number(data.qtyOnHand || 0),
    qtyReserved: Number(data.qtyReserved || 0),
    cost: Number(data.cost || 0),
    price: Number(data.price || 0),
    location: data.location,
    active: data.active !== false,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

export async function createPart(
  input: Omit<PartItem, 'id' | 'createdAt' | 'updatedAt' | 'qtyReserved'> & { qtyReserved?: number }
): Promise<PartItem> {
  const sku = String(input.sku || '').trim().toUpperCase();
  if (!sku || !input.name) throw new Error('SKU y nombre son requeridos');
  const existing = await col(input.tenantId).where('sku', '==', sku).limit(1).get();
  if (!existing.empty) throw new Error(`Ya existe la pieza con SKU ${sku}`);

  const ref = col(input.tenantId).doc();
  const row: PartItem = {
    id: ref.id,
    tenantId: input.tenantId,
    sku,
    name: input.name.trim(),
    description: input.description,
    qtyOnHand: Number(input.qtyOnHand || 0),
    qtyReserved: Number(input.qtyReserved || 0),
    cost: Number(input.cost || 0),
    price: Number(input.price || 0),
    location: input.location,
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

export async function getPart(tenantId: string, id: string): Promise<PartItem | null> {
  const snap = await col(tenantId).doc(id).get();
  if (!snap.exists) return null;
  return normalize(snap.id, snap.data());
}

export async function listParts(
  tenantId: string,
  opts?: { activeOnly?: boolean; limit?: number; search?: string }
): Promise<PartItem[]> {
  const snap = await col(tenantId).limit(opts?.limit || 300).get();
  let rows = snap.docs.map((d) => normalize(d.id, d.data()));
  if (opts?.activeOnly !== false) rows = rows.filter((p) => p.active);
  const q = opts?.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => a.sku.localeCompare(b.sku));
  return rows;
}

export async function updatePart(
  tenantId: string,
  id: string,
  patch: Partial<Omit<PartItem, 'id' | 'tenantId' | 'createdAt'>>
): Promise<PartItem> {
  const current = await getPart(tenantId, id);
  if (!current) throw new Error('Pieza no encontrada');
  const merged = { ...current, ...patch, updatedAt: new Date() };
  if (patch.sku) merged.sku = String(patch.sku).trim().toUpperCase();
  const { id: _i, createdAt: _c, ...toSave } = merged;
  await col(tenantId)
    .doc(id)
    .set({ ...toSave, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
  return merged;
}

/** Ajuste de inventario (+/-). delta positivo = entrada. */
export async function adjustPartStock(
  tenantId: string,
  partId: string,
  delta: number,
  reason?: string
): Promise<PartItem> {
  const part = await getPart(tenantId, partId);
  if (!part) throw new Error('Pieza no encontrada');
  const next = part.qtyOnHand + delta;
  if (next < 0) throw new Error('Stock insuficiente');
  const updated = await updatePart(tenantId, partId, { qtyOnHand: next });
  await col(tenantId)
    .doc(partId)
    .collection('stock_moves')
    .add({
      delta,
      reason: reason || null,
      qtyAfter: next,
      createdAt: getFirestoreFieldValue().serverTimestamp(),
    });
  return updated;
}

/** Descuenta stock al usar en RO (qty). */
export async function consumePartForRo(
  tenantId: string,
  partId: string,
  qty: number
): Promise<PartItem> {
  return adjustPartStock(tenantId, partId, -Math.abs(qty), 'ro_consume');
}
