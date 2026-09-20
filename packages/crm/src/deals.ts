// Deal desk lite — cotización / reserva / handoff a F&I y venta

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import type { Sale } from './types';

function getDb() {
  return getFirestore();
}

function tenantDeals(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('deals');
}

export type DealStatus =
  | 'draft'
  | 'quoted'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'reserved'
  | 'fi_handoff'
  | 'won'
  | 'lost'
  | 'cancelled'
  | 'expired';

export interface DealBuyer {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface Deal {
  id: string;
  tenantId: string;
  leadId?: string;
  vehicleId: string;
  sellerId?: string;
  buyer: DealBuyer;
  vehiclePrice: number;
  tradeInValue?: number;
  rebate?: number;
  tablilla?: number;
  tax?: number;
  insurance?: number;
  accessories?: number;
  warranty?: number;
  servicePackage?: number;
  fees?: number;
  other?: number;
  /** Total cotizado (antes de depósito) */
  total: number;
  depositAmount: number;
  currency: string;
  status: DealStatus;
  notes?: string;
  expiresAt?: Date | null;
  depositPaymentIntentId?: string | null;
  depositCheckoutSessionId?: string | null;
  depositPaidAt?: Date | null;
  fiRequestId?: string | null;
  saleId?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function computeDealTotal(input: Partial<Deal>): number {
  const vehicle = Number(input.vehiclePrice || 0);
  const trade = Number(input.tradeInValue || 0);
  const rebate = Number(input.rebate || 0);
  const parts =
    Number(input.tablilla || 0) +
    Number(input.tax || 0) +
    Number(input.insurance || 0) +
    Number(input.accessories || 0) +
    Number(input.warranty || 0) +
    Number(input.servicePackage || 0) +
    Number(input.fees || 0) +
    Number(input.other || 0);
  return Math.round((vehicle - trade - rebate + parts) * 100) / 100;
}

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function normalizeDeal(id: string, data: any): Deal {
  return {
    id,
    tenantId: data.tenantId,
    leadId: data.leadId,
    vehicleId: data.vehicleId,
    sellerId: data.sellerId,
    buyer: data.buyer || { fullName: '' },
    vehiclePrice: Number(data.vehiclePrice || 0),
    tradeInValue: data.tradeInValue != null ? Number(data.tradeInValue) : undefined,
    rebate: data.rebate != null ? Number(data.rebate) : undefined,
    tablilla: data.tablilla != null ? Number(data.tablilla) : undefined,
    tax: data.tax != null ? Number(data.tax) : undefined,
    insurance: data.insurance != null ? Number(data.insurance) : undefined,
    accessories: data.accessories != null ? Number(data.accessories) : undefined,
    warranty: data.warranty != null ? Number(data.warranty) : undefined,
    servicePackage: data.servicePackage != null ? Number(data.servicePackage) : undefined,
    fees: data.fees != null ? Number(data.fees) : undefined,
    other: data.other != null ? Number(data.other) : undefined,
    total: Number(data.total || 0),
    depositAmount: Number(data.depositAmount || 0),
    currency: data.currency || 'USD',
    status: data.status || 'draft',
    notes: data.notes,
    expiresAt: toDate(data.expiresAt) || null,
    depositPaymentIntentId: data.depositPaymentIntentId || null,
    depositCheckoutSessionId: data.depositCheckoutSessionId || null,
    depositPaidAt: toDate(data.depositPaidAt) || null,
    fiRequestId: data.fiRequestId || null,
    saleId: data.saleId || null,
    createdBy: data.createdBy || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  };
}

export async function createDeal(
  input: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'status'> & {
    status?: DealStatus;
    total?: number;
  }
): Promise<Deal> {
  if (!input.tenantId || !input.vehicleId || !input.buyer?.fullName) {
    throw new Error('tenantId, vehicleId y buyer.fullName son requeridos');
  }
  const ref = tenantDeals(input.tenantId).doc();
  const total = input.total != null ? Number(input.total) : computeDealTotal(input);
  const now = new Date();
  const deal: Deal = {
    id: ref.id,
    tenantId: input.tenantId,
    leadId: input.leadId,
    vehicleId: input.vehicleId,
    sellerId: input.sellerId,
    buyer: input.buyer,
    vehiclePrice: Number(input.vehiclePrice || 0),
    tradeInValue: input.tradeInValue,
    rebate: input.rebate,
    tablilla: input.tablilla,
    tax: input.tax,
    insurance: input.insurance,
    accessories: input.accessories,
    warranty: input.warranty,
    servicePackage: input.servicePackage,
    fees: input.fees,
    other: input.other,
    total,
    depositAmount: Number(input.depositAmount || 0),
    currency: input.currency || 'USD',
    status: input.status || 'quoted',
    notes: input.notes,
    expiresAt: input.expiresAt || null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set({
    ...deal,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
    expiresAt: deal.expiresAt || null,
  });
  return deal;
}

export async function getDeal(tenantId: string, dealId: string): Promise<Deal | null> {
  const snap = await tenantDeals(tenantId).doc(dealId).get();
  if (!snap.exists) return null;
  return normalizeDeal(snap.id, snap.data());
}

export async function listDeals(
  tenantId: string,
  opts?: { status?: DealStatus; leadId?: string; vehicleId?: string; limit?: number }
): Promise<Deal[]> {
  let q: any = tenantDeals(tenantId);
  if (opts?.status) q = q.where('status', '==', opts.status);
  if (opts?.leadId) q = q.where('leadId', '==', opts.leadId);
  if (opts?.vehicleId) q = q.where('vehicleId', '==', opts.vehicleId);
  const snap = await q.limit(opts?.limit || 100).get();
  const rows = snap.docs.map((d: any) => normalizeDeal(d.id, d.data()));
  rows.sort((a: Deal, b: Deal) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  return rows;
}

export async function updateDeal(
  tenantId: string,
  dealId: string,
  patch: Partial<
    Omit<Deal, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>
  >
): Promise<Deal> {
  const current = await getDeal(tenantId, dealId);
  if (!current) throw new Error('Deal no encontrado');

  const merged: Deal = {
    ...current,
    ...patch,
    buyer: patch.buyer ? { ...current.buyer, ...patch.buyer } : current.buyer,
    updatedAt: new Date(),
  };
  merged.total = patch.total != null ? Number(patch.total) : computeDealTotal(merged);

  const { id: _id, createdAt: _c, createdBy: _by, ...toSave } = merged;
  await tenantDeals(tenantId)
    .doc(dealId)
    .set(
      {
        ...toSave,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
  return merged;
}

/** Reserva el vehículo del inventario al marcar depósito / hold */
export async function reserveDealVehicle(tenantId: string, vehicleId: string): Promise<void> {
  try {
    const { updateVehicleStatus } = await import('@autodealers/inventory');
    await updateVehicleStatus(tenantId, vehicleId, 'reserved');
  } catch (e) {
    console.warn('[deals] No se pudo reservar vehículo:', e);
  }
}

export async function releaseDealVehicle(tenantId: string, vehicleId: string): Promise<void> {
  try {
    const { updateVehicleStatus, getVehicleById } = await import('@autodealers/inventory');
    const vehicle = await getVehicleById(tenantId, vehicleId);
    if (vehicle && vehicle.status === 'reserved') {
      await updateVehicleStatus(tenantId, vehicleId, 'available');
    }
  } catch (e) {
    console.warn('[deals] No se pudo liberar vehículo:', e);
  }
}

export async function markDealDepositPaid(
  tenantId: string,
  dealId: string,
  paymentIntentId?: string
): Promise<Deal> {
  const deal = await updateDeal(tenantId, dealId, {
    status: 'deposit_paid',
    depositPaymentIntentId: paymentIntentId || undefined,
    depositPaidAt: new Date(),
  });
  await reserveDealVehicle(tenantId, deal.vehicleId);
  const reserved = await updateDeal(tenantId, dealId, { status: 'reserved' });
  return reserved;
}

export async function cancelDeal(
  tenantId: string,
  dealId: string,
  releaseVehicle = true
): Promise<Deal> {
  const deal = await getDeal(tenantId, dealId);
  if (!deal) throw new Error('Deal no encontrado');
  const updated = await updateDeal(tenantId, dealId, { status: 'cancelled' });
  if (releaseVehicle) await releaseDealVehicle(tenantId, deal.vehicleId);
  return updated;
}

export async function handoffDealToFi(
  tenantId: string,
  dealId: string,
  fiRequestId: string
): Promise<Deal> {
  return updateDeal(tenantId, dealId, {
    status: 'fi_handoff',
    fiRequestId,
  });
}

/** Convierte un deal ganado en Sale (pending) usando createSale */
export async function convertDealToSale(
  tenantId: string,
  dealId: string,
  sellerId: string
): Promise<{ deal: Deal; sale: Sale }> {
  const deal = await getDeal(tenantId, dealId);
  if (!deal) throw new Error('Deal no encontrado');
  if (deal.saleId) {
    const { getSaleById } = await import('./sales');
    const existing = await getSaleById(tenantId, deal.saleId);
    if (existing) return { deal, sale: existing };
  }

  const { createSale } = await import('./sales');
  const sale = await createSale({
    tenantId,
    leadId: deal.leadId,
    vehicleId: deal.vehicleId,
    sellerId: deal.sellerId || sellerId,
    buyer: {
      fullName: deal.buyer.fullName,
      phone: deal.buyer.phone || '',
      email: deal.buyer.email || '',
      address: {},
    },
    salePrice: deal.vehiclePrice,
    vehiclePrice: deal.vehiclePrice,
    bonus1: 0,
    bonus2: 0,
    rebate: deal.rebate || 0,
    tablilla: deal.tablilla || 0,
    insurance: deal.insurance || 0,
    accessories: deal.accessories || 0,
    warranty: deal.warranty || 0,
    servicePackage: deal.servicePackage || 0,
    other: Number(deal.other || 0) + Number(deal.fees || 0) + Number(deal.tax || 0),
    total: deal.total,
    currency: deal.currency || 'USD',
    paymentMethod: deal.depositAmount > 0 ? 'deposit' : 'pending',
    status: 'pending',
    documents: [],
    notes: deal.notes || `Deal ${deal.id}`,
    tradeInValue: deal.tradeInValue,
  });

  const updated = await updateDeal(tenantId, dealId, {
    status: 'won',
    saleId: sale.id,
  });
  return { deal: updated, sale };
}
