// Órdenes de reparación (RO) — módulo Servicio / Taller

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

function col(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('repair_orders');
}

export type RepairOrderStatus =
  | 'intake'
  | 'diagnosing'
  | 'waiting_parts'
  | 'in_progress'
  | 'quality_check'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface RoLaborLine {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  technicianId?: string;
}

export interface RoPartLine {
  id: string;
  partId?: string;
  sku?: string;
  description: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  amount: number;
}

export interface RepairOrder {
  id: string;
  tenantId: string;
  number: string;
  status: RepairOrderStatus;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  leadId?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  vin?: string;
  plate?: string;
  appointmentId?: string;
  complaints: string[];
  diagnosis?: string;
  labor: RoLaborLine[];
  parts: RoPartLine[];
  laborTotal: number;
  partsTotal: number;
  tax: number;
  total: number;
  notes?: string;
  advisorId?: string;
  technicianId?: string;
  hoursLogged?: number;
  photos?: string[];
  videos?: string[];
  estimateId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
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

export function computeRoTotals(ro: Pick<RepairOrder, 'labor' | 'parts' | 'tax'>) {
  const laborTotal = round2((ro.labor || []).reduce((s, l) => s + Number(l.amount || 0), 0));
  const partsTotal = round2((ro.parts || []).reduce((s, p) => s + Number(p.amount || 0), 0));
  const tax = round2(Number(ro.tax || 0));
  return { laborTotal, partsTotal, tax, total: round2(laborTotal + partsTotal + tax) };
}

function normalize(id: string, data: any): RepairOrder {
  const labor = Array.isArray(data.labor) ? data.labor : [];
  const parts = Array.isArray(data.parts) ? data.parts : [];
  const totals = computeRoTotals({ labor, parts, tax: data.tax });
  return {
    id,
    tenantId: data.tenantId,
    number: data.number || id.slice(0, 8).toUpperCase(),
    status: data.status || 'intake',
    customerName: data.customerName || '',
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    leadId: data.leadId,
    vehicleId: data.vehicleId,
    vehicleLabel: data.vehicleLabel,
    vin: data.vin,
    plate: data.plate,
    appointmentId: data.appointmentId,
    complaints: Array.isArray(data.complaints) ? data.complaints : [],
    diagnosis: data.diagnosis,
    labor,
    parts,
    laborTotal: totals.laborTotal,
    partsTotal: totals.partsTotal,
    tax: totals.tax,
    total: totals.total,
    notes: data.notes,
    advisorId: data.advisorId,
    technicianId: data.technicianId,
    hoursLogged: Number(data.hoursLogged || 0),
    photos: Array.isArray(data.photos) ? data.photos.filter(Boolean) : [],
    videos: Array.isArray(data.videos) ? data.videos.filter(Boolean) : [],
    estimateId: data.estimateId,
    createdBy: data.createdBy || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
    closedAt: toDate(data.closedAt) || null,
  };
}

async function nextRoNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await col(tenantId).where('numberPrefix', '==', `RO-${year}`).limit(500).get();
  const n = snap.size + 1;
  return `RO-${year}-${String(n).padStart(4, '0')}`;
}

export async function createRepairOrder(
  input: Omit<RepairOrder, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'laborTotal' | 'partsTotal' | 'total'> & {
    number?: string;
  }
): Promise<RepairOrder> {
  const ref = col(input.tenantId).doc();
  const number = input.number || (await nextRoNumber(input.tenantId));
  const year = new Date().getFullYear();
  const totals = computeRoTotals(input);
  const row: RepairOrder = {
    id: ref.id,
    tenantId: input.tenantId,
    number,
    status: input.status || 'intake',
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    leadId: input.leadId,
    vehicleId: input.vehicleId,
    vehicleLabel: input.vehicleLabel,
    vin: input.vin,
    plate: input.plate,
    appointmentId: input.appointmentId,
    complaints: input.complaints || [],
    diagnosis: input.diagnosis,
    labor: input.labor || [],
    parts: input.parts || [],
    ...totals,
    notes: input.notes,
    advisorId: input.advisorId,
    technicianId: input.technicianId,
    hoursLogged: input.hoursLogged || 0,
    photos: input.photos || [],
    videos: input.videos || [],
    estimateId: input.estimateId,
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
    closedAt: null,
  };
  await ref.set({
    ...row,
    numberPrefix: `RO-${year}`,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return row;
}

export async function getRepairOrder(tenantId: string, id: string): Promise<RepairOrder | null> {
  const snap = await col(tenantId).doc(id).get();
  if (!snap.exists) return null;
  return normalize(snap.id, snap.data());
}

export async function listRepairOrders(
  tenantId: string,
  opts?: { status?: RepairOrderStatus; limit?: number }
): Promise<RepairOrder[]> {
  let q: any = col(tenantId);
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d: any) => normalize(d.id, d.data()));
  rows.sort((a: RepairOrder, b: RepairOrder) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  return rows;
}

export async function updateRepairOrder(
  tenantId: string,
  id: string,
  patch: Partial<RepairOrder>
): Promise<RepairOrder> {
  const current = await getRepairOrder(tenantId, id);
  if (!current) throw new Error('RO no encontrada');
  const merged: RepairOrder = {
    ...current,
    ...patch,
    labor: patch.labor ?? current.labor,
    parts: patch.parts ?? current.parts,
    complaints: patch.complaints ?? current.complaints,
    updatedAt: new Date(),
  };
  const totals = computeRoTotals(merged);
  Object.assign(merged, totals);
  if (patch.status === 'delivered' || patch.status === 'cancelled') {
    merged.closedAt = new Date();
  }
  const { id: _i, createdAt: _c, ...toSave } = merged;
  await col(tenantId)
    .doc(id)
    .set({ ...toSave, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
  return merged;
}

/** Texto simple para PDF / impresión (sin dependencia pesada en el cliente) */
export function repairOrderPlainText(ro: RepairOrder): string {
  const lines = [
    `Orden de reparación ${ro.number}`,
    `Estado: ${ro.status}`,
    `Cliente: ${ro.customerName}${ro.customerPhone ? ` · ${ro.customerPhone}` : ''}`,
    `Vehículo: ${ro.vehicleLabel || ro.vehicleId || '—'} ${ro.plate ? `· Tablilla ${ro.plate}` : ''}`,
    `VIN: ${ro.vin || '—'}`,
    '',
    'Quejas / motivos:',
    ...(ro.complaints.length ? ro.complaints.map((c) => `- ${c}`) : ['- (ninguna)']),
    '',
    `Diagnóstico: ${ro.diagnosis || '—'}`,
    '',
    'Mano de obra:',
    ...ro.labor.map((l) => `- ${l.description}: ${l.hours}h x $${l.rate} = $${l.amount}`),
    `Subtotal labor: $${ro.laborTotal}`,
    '',
    'Piezas:',
    ...ro.parts.map((p) => `- ${p.sku || ''} ${p.description}: ${p.qty} x $${p.unitPrice} = $${p.amount}`),
    `Subtotal piezas: $${ro.partsTotal}`,
    `Tax: $${ro.tax}`,
    `TOTAL: $${ro.total}`,
    '',
    `Técnico: ${ro.technicianId || '—'}`,
    `Horas registradas: ${ro.hoursLogged || 0}`,
    `Fotos: ${(ro.photos || []).length} · Videos: ${(ro.videos || []).length}`,
    `Notas: ${ro.notes || '—'}`,
  ];
  return lines.join('\n');
}
