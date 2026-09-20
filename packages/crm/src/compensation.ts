// Compensación / liquidaciones / vacaciones (DMS RR.HH. light)

import { getFirestore } from '@autodealers/shared';
import type { Sale } from './types';

function getDb() {
  return getFirestore();
}

function tenantRef(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId);
}

export interface CompensationProductRates {
  vehicle: number;
  insurance: number;
  accessories: number;
  warranty: number;
  servicePackage: number;
  other: number;
}

export interface CompensationSettings {
  tenantId: string;
  rates: CompensationProductRates;
  /** Días de vacaciones por año calendario */
  annualLeaveDays: number;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface PayoutLine {
  product: string;
  label: string;
  amount: number;
}

export interface CompensationPayout {
  id: string;
  tenantId: string;
  sellerId: string;
  sellerName?: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  status: 'pending' | 'paid' | 'cancelled';
  lines: PayoutLine[];
  totalAmount: number;
  currency: string;
  notes?: string;
  saleIds?: string[];
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  sellerId: string;
  sellerName?: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewerId?: string;
  reviewerNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  sellerId: string;
  year: number;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
}

export const DEFAULT_COMPENSATION_RATES: CompensationProductRates = {
  vehicle: 2.5,
  insurance: 10,
  accessories: 8,
  warranty: 8,
  servicePackage: 5,
  other: 0,
};

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function getCompensationSettings(tenantId: string): Promise<CompensationSettings> {
  const doc = await getDb().collection('compensation_settings').doc(tenantId).get();
  if (!doc.exists) {
    return {
      tenantId,
      rates: { ...DEFAULT_COMPENSATION_RATES },
      annualLeaveDays: 15,
    };
  }
  const data = doc.data() || {};
  return {
    tenantId,
    rates: { ...DEFAULT_COMPENSATION_RATES, ...(data.rates || {}) },
    annualLeaveDays: typeof data.annualLeaveDays === 'number' ? data.annualLeaveDays : 15,
    updatedAt: toDate(data.updatedAt),
    updatedBy: data.updatedBy,
  };
}

export async function saveCompensationSettings(
  tenantId: string,
  patch: Partial<Pick<CompensationSettings, 'rates' | 'annualLeaveDays'>>,
  updatedBy?: string
): Promise<CompensationSettings> {
  const current = await getCompensationSettings(tenantId);
  const next: CompensationSettings = {
    tenantId,
    rates: { ...current.rates, ...(patch.rates || {}) },
    annualLeaveDays:
      patch.annualLeaveDays !== undefined ? patch.annualLeaveDays : current.annualLeaveDays,
    updatedAt: new Date(),
    updatedBy,
  };
  await getDb()
    .collection('compensation_settings')
    .doc(tenantId)
    .set(JSON.parse(JSON.stringify(next)), { merge: true });
  return next;
}

/** Calcula desglose de comisiones/bonos a partir de una venta y tasas */
export function computeSaleCompensation(
  sale: Partial<Sale>,
  rates: CompensationProductRates
): {
  vehicleCommission: number;
  insuranceCommission: number;
  accessoriesCommission: number;
  warrantyCommission: number;
  servicePackageCommission: number;
  otherCommission: number;
  bonusTotal: number;
  totalCommission: number;
  lines: PayoutLine[];
} {
  const vehicleBase = Number(sale.salePrice ?? sale.vehiclePrice ?? 0) || 0;
  const insurance = Number(sale.insurance ?? 0) || 0;
  const accessories = Number(sale.accessories ?? 0) || 0;
  const warranty = Number(sale.warranty ?? 0) || 0;
  const servicePackage = Number(sale.servicePackage ?? 0) || 0;
  const other = Number(sale.other ?? 0) || 0;
  const bonus1 = Number(sale.bonus1 ?? 0) || 0;
  const bonus2 = Number(sale.bonus2 ?? 0) || 0;

  const vehicleRate = Number(sale.vehicleCommissionRate ?? rates.vehicle) || 0;
  const insuranceRate = Number(sale.insuranceCommissionRate ?? rates.insurance) || 0;
  const accessoriesRate = Number(sale.accessoriesCommissionRate ?? rates.accessories) || 0;
  const warrantyRate = rates.warranty;
  const serviceRate = rates.servicePackage;
  const otherRate = rates.other;

  const vehicleCommission =
    sale.vehicleCommission != null
      ? Number(sale.vehicleCommission)
      : (vehicleBase * vehicleRate) / 100;
  const insuranceCommission =
    sale.insuranceCommission != null
      ? Number(sale.insuranceCommission)
      : (insurance * insuranceRate) / 100;
  const accessoriesCommission =
    sale.accessoriesCommission != null
      ? Number(sale.accessoriesCommission)
      : (accessories * accessoriesRate) / 100;
  const warrantyCommission =
    sale.warrantyCommission != null
      ? Number(sale.warrantyCommission)
      : (warranty * warrantyRate) / 100;
  const servicePackageCommission =
    sale.servicePackageCommission != null
      ? Number(sale.servicePackageCommission)
      : (servicePackage * serviceRate) / 100;
  const otherCommission = (other * otherRate) / 100;
  const bonusTotal = bonus1 + bonus2;

  const totalCommission =
    vehicleCommission +
    insuranceCommission +
    accessoriesCommission +
    warrantyCommission +
    servicePackageCommission +
    otherCommission +
    bonusTotal;

  const lines: PayoutLine[] = [
    { product: 'vehicle', label: 'Comisión vehículo', amount: round2(vehicleCommission) },
    { product: 'insurance', label: 'Comisión seguro', amount: round2(insuranceCommission) },
    { product: 'accessories', label: 'Comisión accesorios', amount: round2(accessoriesCommission) },
    { product: 'warranty', label: 'Comisión warranty', amount: round2(warrantyCommission) },
    {
      product: 'servicePackage',
      label: 'Comisión paquete servicio',
      amount: round2(servicePackageCommission),
    },
    { product: 'other', label: 'Comisión otros', amount: round2(otherCommission) },
    { product: 'bonus1', label: 'Bono 1', amount: round2(bonus1) },
    { product: 'bonus2', label: 'Bono 2', amount: round2(bonus2) },
  ].filter((l) => l.amount !== 0);

  return {
    vehicleCommission: round2(vehicleCommission),
    insuranceCommission: round2(insuranceCommission),
    accessoriesCommission: round2(accessoriesCommission),
    warrantyCommission: round2(warrantyCommission),
    servicePackageCommission: round2(servicePackageCommission),
    otherCommission: round2(otherCommission),
    bonusTotal: round2(bonusTotal),
    totalCommission: round2(totalCommission),
    lines,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Aplica comisiones a un payload de venta antes de guardar */
export async function applyCompensationToSalePayload(
  tenantId: string,
  sale: Partial<Sale>
): Promise<Partial<Sale>> {
  const settings = await getCompensationSettings(tenantId);
  const calc = computeSaleCompensation(sale, settings.rates);
  return {
    ...sale,
    vehicleCommissionRate: sale.vehicleCommissionRate ?? settings.rates.vehicle,
    insuranceCommissionRate: sale.insuranceCommissionRate ?? settings.rates.insurance,
    accessoriesCommissionRate: sale.accessoriesCommissionRate ?? settings.rates.accessories,
    vehicleCommission: calc.vehicleCommission,
    insuranceCommission: calc.insuranceCommission,
    accessoriesCommission: calc.accessoriesCommission,
    warrantyCommission: calc.warrantyCommission,
    servicePackageCommission: calc.servicePackageCommission,
    totalCommission: calc.totalCommission,
  };
}

export async function listSellerSales(
  tenantId: string,
  sellerId: string,
  opts?: { status?: string; limit?: number }
): Promise<Sale[]> {
  let q: any = tenantRef(tenantId).collection('sales').where('sellerId', '==', sellerId);
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.limit(opts?.limit || 200).get();
  const sales = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Sale));
  sales.sort((a: Sale, b: Sale) => {
    const ta = toDate(a.completedAt || a.createdAt)?.getTime() || 0;
    const tb = toDate(b.completedAt || b.createdAt)?.getTime() || 0;
    return tb - ta;
  });
  return sales;
}

export async function getCompensationSummary(tenantId: string, sellerId: string) {
  const settings = await getCompensationSettings(tenantId);
  const sales = await listSellerSales(tenantId, sellerId, { status: 'completed', limit: 500 });
  let earned = 0;
  let bonuses = 0;
  const byProduct: Record<string, number> = {};
  for (const sale of sales) {
    const calc = computeSaleCompensation(sale, settings.rates);
    earned += calc.totalCommission;
    bonuses += calc.bonusTotal;
    for (const line of calc.lines) {
      byProduct[line.product] = round2((byProduct[line.product] || 0) + line.amount);
    }
  }

  const payouts = await listPayouts(tenantId, { sellerId, limit: 200 });
  const paid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + Number(p.totalAmount || 0), 0);
  const pendingPayouts = payouts
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + Number(p.totalAmount || 0), 0);

  const year = new Date().getFullYear();
  const balance = await getLeaveBalance(tenantId, sellerId, year);

  return {
    salesCount: sales.length,
    earnedCommission: round2(earned),
    bonuses: round2(bonuses),
    byProduct,
    paidOut: round2(paid),
    pendingPayouts: round2(pendingPayouts),
    balanceDue: round2(Math.max(0, earned - paid)),
    leave: balance,
    currency: 'USD',
  };
}

export async function listPayouts(
  tenantId: string,
  opts?: { sellerId?: string; limit?: number }
): Promise<CompensationPayout[]> {
  let q: any = tenantRef(tenantId).collection('compensation_payouts');
  if (opts?.sellerId) q = q.where('sellerId', '==', opts.sellerId);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d: any) => normalizePayout(d.id, d.data()));
  rows.sort((a: CompensationPayout, b: CompensationPayout) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return rows;
}

function normalizePayout(id: string, data: any): CompensationPayout {
  return {
    id,
    tenantId: data.tenantId,
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    status: data.status || 'pending',
    lines: Array.isArray(data.lines) ? data.lines : [],
    totalAmount: Number(data.totalAmount || 0),
    currency: data.currency || 'USD',
    notes: data.notes,
    saleIds: data.saleIds || [],
    paidAt: toDate(data.paidAt) || null,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
    createdBy: data.createdBy || '',
  };
}

export async function createPayout(
  input: Omit<CompensationPayout, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: CompensationPayout['status'];
  }
): Promise<CompensationPayout> {
  const ref = tenantRef(input.tenantId).collection('compensation_payouts').doc();
  const now = new Date();
  const row: CompensationPayout = {
    id: ref.id,
    tenantId: input.tenantId,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status: input.status || 'pending',
    lines: input.lines || [],
    totalAmount: round2(Number(input.totalAmount || 0)),
    currency: input.currency || 'USD',
    notes: input.notes,
    saleIds: input.saleIds || [],
    paidAt: input.status === 'paid' ? now : null,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  };
  await ref.set(JSON.parse(JSON.stringify(row)));
  return row;
}

export async function updatePayoutStatus(
  tenantId: string,
  payoutId: string,
  status: CompensationPayout['status']
): Promise<void> {
  const patch: any = { status, updatedAt: new Date() };
  if (status === 'paid') patch.paidAt = new Date();
  await tenantRef(tenantId).collection('compensation_payouts').doc(payoutId).set(patch, { merge: true });
}

function businessDaysInclusive(start: string, end: string): number {
  const a = new Date(start + 'T12:00:00');
  const b = new Date(end + 'T12:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return 0;
  let days = 0;
  const cur = new Date(a);
  while (cur <= b) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export async function getLeaveBalance(
  tenantId: string,
  sellerId: string,
  year: number
): Promise<LeaveBalance> {
  const settings = await getCompensationSettings(tenantId);
  const snap = await tenantRef(tenantId)
    .collection('leave_requests')
    .where('sellerId', '==', sellerId)
    .get();
  let used = 0;
  let pending = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const startYear = String(d.startDate || '').slice(0, 4);
    if (startYear !== String(year)) continue;
    if (d.status === 'approved') used += Number(d.days || 0);
    if (d.status === 'pending') pending += Number(d.days || 0);
  }
  return {
    sellerId,
    year,
    entitledDays: settings.annualLeaveDays,
    usedDays: used,
    pendingDays: pending,
  };
}

export async function listLeaveRequests(
  tenantId: string,
  opts?: { sellerId?: string; status?: string; limit?: number }
): Promise<LeaveRequest[]> {
  let q: any = tenantRef(tenantId).collection('leave_requests');
  if (opts?.sellerId) q = q.where('sellerId', '==', opts.sellerId);
  if (opts?.status) q = q.where('status', '==', opts.status);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d: any) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId: data.tenantId,
      sellerId: data.sellerId,
      sellerName: data.sellerName,
      startDate: data.startDate,
      endDate: data.endDate,
      days: Number(data.days || 0),
      reason: data.reason,
      status: data.status || 'pending',
      reviewerId: data.reviewerId,
      reviewerNote: data.reviewerNote,
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
    } as LeaveRequest;
  });
  rows.sort((a: LeaveRequest, b: LeaveRequest) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return rows;
}

export async function createLeaveRequest(input: {
  tenantId: string;
  sellerId: string;
  sellerName?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<LeaveRequest> {
  const days = businessDaysInclusive(input.startDate, input.endDate);
  if (days <= 0) throw new Error('Rango de fechas inválido');
  const year = Number(input.startDate.slice(0, 4));
  const balance = await getLeaveBalance(input.tenantId, input.sellerId, year);
  const available = balance.entitledDays - balance.usedDays - balance.pendingDays;
  if (days > available) {
    throw new Error(`Solo tienes ${available} día(s) disponible(s) este año`);
  }
  const ref = tenantRef(input.tenantId).collection('leave_requests').doc();
  const now = new Date();
  const row: LeaveRequest = {
    id: ref.id,
    tenantId: input.tenantId,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    reason: input.reason,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(JSON.parse(JSON.stringify(row)));
  return row;
}

export async function reviewLeaveRequest(
  tenantId: string,
  leaveId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  reviewerNote?: string
): Promise<void> {
  await tenantRef(tenantId)
    .collection('leave_requests')
    .doc(leaveId)
    .set(
      {
        status,
        reviewerId,
        reviewerNote: reviewerNote || null,
        updatedAt: new Date(),
      },
      { merge: true }
    );
}

