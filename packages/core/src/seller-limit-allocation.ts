/**
 * Límites de uso e inventario asignados por el dealer a cada vendedor.
 * Nunca pueden superar los límites de la membresía del concesionario.
 */

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { getTenantMembership } from './membership-validation';
import type { FeatureCheckResult } from './feature-executor';

function getDb() {
  return getFirestore();
}

export type SellerAssignableLimitKey =
  | 'maxInventory'
  | 'maxPromotions'
  | 'maxCampaigns'
  | 'maxLeadsPerMonth'
  | 'maxAppointmentsPerMonth';

export const SELLER_ASSIGNABLE_LIMIT_KEYS: SellerAssignableLimitKey[] = [
  'maxInventory',
  'maxPromotions',
  'maxCampaigns',
  'maxLeadsPerMonth',
  'maxAppointmentsPerMonth',
];

export type AssignedSellerLimits = Partial<Record<SellerAssignableLimitKey, number>>;

export type SellerLimitUsage = Record<SellerAssignableLimitKey, number>;

export type SellerLimitsSummary = {
  assigned: AssignedSellerLimits;
  usage: SellerLimitUsage;
  planCaps: Partial<Record<SellerAssignableLimitKey, number | null>>;
  effective: Partial<Record<SellerAssignableLimitKey, number | null>>;
};

const LIMIT_LABELS: Record<SellerAssignableLimitKey, string> = {
  maxInventory: 'Inventario (vehículos)',
  maxPromotions: 'Promociones',
  maxCampaigns: 'Campañas',
  maxLeadsPerMonth: 'Leads / mes',
  maxAppointmentsPerMonth: 'Citas / mes',
};

export function sellerLimitLabel(key: SellerAssignableLimitKey): string {
  return LIMIT_LABELS[key];
}

function parsePositiveInt(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export function parseAssignedSellerLimits(raw: unknown): AssignedSellerLimits {
  if (!raw || typeof raw !== 'object') return {};
  const src = raw as Record<string, unknown>;
  const out: AssignedSellerLimits = {};
  for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
    if (!(key in src)) continue;
    if (src[key] === null || src[key] === '') continue;
    const n = parsePositiveInt(src[key]);
    if (n !== undefined) out[key] = n;
  }
  return out;
}

/** Fusiona límites existentes con un patch (null o vacío = quitar límite). */
export function mergeAssignedSellerLimits(
  existing: AssignedSellerLimits,
  patch: Record<string, unknown>
): AssignedSellerLimits {
  const merged: AssignedSellerLimits = { ...existing };
  for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
    if (!(key in patch)) continue;
    const v = patch[key];
    if (v === null || v === '' || v === undefined) {
      delete merged[key];
      continue;
    }
    const n = parsePositiveInt(v);
    if (n === undefined) delete merged[key];
    else merged[key] = n;
  }
  return merged;
}

function planCap(
  features: Record<string, unknown> | undefined,
  key: SellerAssignableLimitKey
): number | null {
  const v = features?.[key];
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function getDealerPlanLimits(
  dealerTenantId: string
): Promise<Partial<Record<SellerAssignableLimitKey, number | null>>> {
  const membership = await getTenantMembership(dealerTenantId);
  const features = (membership?.features || {}) as Record<string, unknown>;
  const out: Partial<Record<SellerAssignableLimitKey, number | null>> = {};
  for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
    out[key] = planCap(features, key);
  }
  return out;
}

async function loadSellerUser(sellerUserId: string) {
  const doc = await getDb().collection('users').doc(sellerUserId).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  return {
    dealerId: typeof data.dealerId === 'string' ? data.dealerId : undefined,
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    assignedLimits: parseAssignedSellerLimits(data.assignedLimits),
  };
}

export async function getSellerAssignedLimits(
  dealerTenantId: string,
  sellerUserId: string
): Promise<AssignedSellerLimits> {
  const user = await loadSellerUser(sellerUserId);
  if (user?.dealerId === dealerTenantId && Object.keys(user.assignedLimits).length > 0) {
    return user.assignedLimits;
  }

  const linkId = `${dealerTenantId.trim()}_${sellerUserId.trim()}`;
  const linkDoc = await getDb().collection('dealer_seller_links').doc(linkId).get();
  if (linkDoc.exists) {
    return parseAssignedSellerLimits(linkDoc.data()?.assignedLimits);
  }

  return user?.assignedLimits || {};
}

function sellerTenantIds(dealerTenantId: string, sellerTenantId?: string): string[] {
  const ids = new Set<string>();
  if (dealerTenantId) ids.add(dealerTenantId);
  if (sellerTenantId && sellerTenantId !== dealerTenantId) ids.add(sellerTenantId);
  return [...ids];
}

function vehicleBelongsToSeller(veh: Record<string, unknown>, sellerUserId: string): boolean {
  const sid = veh.sellerId || veh.assignedTo || veh.createdBy;
  return typeof sid === 'string' && sid === sellerUserId;
}

export async function countSellerInventory(
  dealerTenantId: string,
  sellerUserId: string,
  sellerTenantId?: string
): Promise<number> {
  const { getVehicles } = await import('@autodealers/inventory');
  let total = 0;
  for (const tid of sellerTenantIds(dealerTenantId, sellerTenantId)) {
    const vehicles = await getVehicles(tid);
    total += vehicles.filter((v) =>
      vehicleBelongsToSeller(v as unknown as Record<string, unknown>, sellerUserId)
    ).length;
  }
  return total;
}

async function countCollectionForSeller(
  tenantId: string,
  collection: string,
  sellerUserId: string,
  field: 'createdBy' | 'assignedTo'
): Promise<number> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection(collection)
    .where(field, '==', sellerUserId)
    .get();
  return snap.size;
}

async function countLeadsThisMonth(
  tenantId: string,
  sellerUserId: string
): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  try {
    const snap = await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .where('assignedTo', '==', sellerUserId)
      .get();
    return snap.docs.filter((doc) => {
      const createdAt = doc.data().createdAt;
      const d =
        createdAt && typeof createdAt.toDate === 'function'
          ? createdAt.toDate()
          : createdAt instanceof Date
            ? createdAt
            : new Date(createdAt);
      return d >= start;
    }).length;
  } catch {
    const { getLeads } = await import('@autodealers/crm');
    const leads = await getLeads(tenantId, { assignedTo: sellerUserId });
    return leads.filter((l) => {
      const d = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt as string);
      return d >= start;
    }).length;
  }
}

async function countAppointmentsThisMonth(
  tenantId: string,
  sellerUserId: string
): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  try {
    const snap = await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('appointments')
      .where('assignedTo', '==', sellerUserId)
      .get();
    return snap.docs.filter((doc) => {
      const createdAt = doc.data().createdAt;
      const d =
        createdAt && typeof createdAt.toDate === 'function'
          ? createdAt.toDate()
          : createdAt instanceof Date
            ? createdAt
            : new Date(createdAt);
      return d >= start;
    }).length;
  } catch {
    const { getAppointments } = await import('@autodealers/crm');
    const appointments = await getAppointments(tenantId);
    return appointments.filter((a) => {
      if (a.assignedTo !== sellerUserId) return false;
      const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as string);
      return d >= start;
    }).length;
  }
}

export async function getSellerUsage(
  dealerTenantId: string,
  sellerUserId: string,
  sellerTenantId?: string
): Promise<SellerLimitUsage> {
  const tenants = sellerTenantIds(dealerTenantId, sellerTenantId);
  let promotions = 0;
  let campaigns = 0;
  let leadsMonth = 0;
  let appointmentsMonth = 0;

  for (const tid of tenants) {
    try {
      promotions += await countCollectionForSeller(tid, 'promotions', sellerUserId, 'createdBy');
    } catch {
      const snap = await getDb().collection('tenants').doc(tid).collection('promotions').get();
      if (tid === sellerTenantId && sellerTenantId !== dealerTenantId) {
        promotions += snap.size;
      }
    }
    campaigns += await countCollectionForSeller(tid, 'campaigns', sellerUserId, 'createdBy');
    leadsMonth += await countLeadsThisMonth(tid, sellerUserId);
    appointmentsMonth += await countAppointmentsThisMonth(tid, sellerUserId);
  }

  return {
    maxInventory: await countSellerInventory(dealerTenantId, sellerUserId, sellerTenantId),
    maxPromotions: promotions,
    maxCampaigns: campaigns,
    maxLeadsPerMonth: leadsMonth,
    maxAppointmentsPerMonth: appointmentsMonth,
  };
}

export async function listDealerSellerUserIds(dealerTenantId: string): Promise<string[]> {
  const ids = new Set<string>();
  const usersSnap = await getDb()
    .collection('users')
    .where('dealerId', '==', dealerTenantId)
    .where('role', '==', 'seller')
    .get();
  for (const doc of usersSnap.docs) ids.add(doc.id);

  const subSnap = await getDb()
    .collection('sub_users')
    .where('dealerTenantId', '==', dealerTenantId)
    .where('isActive', '==', true)
    .get();
  for (const doc of subSnap.docs) ids.add(doc.id);

  return [...ids];
}

export async function sumAssignedLimitsForDealer(
  dealerTenantId: string,
  excludeSellerUserId?: string
): Promise<AssignedSellerLimits> {
  const totals: AssignedSellerLimits = {};
  const sellerIds = await listDealerSellerUserIds(dealerTenantId);
  for (const sid of sellerIds) {
    if (excludeSellerUserId && sid === excludeSellerUserId) continue;
    const assigned = await getSellerAssignedLimits(dealerTenantId, sid);
    for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
      const v = assigned[key];
      if (v === undefined) continue;
      totals[key] = (totals[key] || 0) + v;
    }
  }
  return totals;
}

export type ValidateAssignedLimitsResult =
  | { ok: true; normalized: AssignedSellerLimits }
  | { ok: false; error: string };

export async function validateAssignedLimitsForDealer(
  dealerTenantId: string,
  sellerUserId: string,
  patch: AssignedSellerLimits
): Promise<ValidateAssignedLimitsResult> {
  const planCaps = await getDealerPlanLimits(dealerTenantId);
  const normalized = parseAssignedSellerLimits(patch);
  const otherTotals = await sumAssignedLimitsForDealer(dealerTenantId, sellerUserId);

  for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
    const value = normalized[key];
    if (value === undefined) continue;

    const cap = planCaps[key];
    if (cap !== null && cap !== undefined && value > cap) {
      return {
        ok: false,
        error: `${sellerLimitLabel(key)}: no puede superar el límite del plan (${cap}).`,
      };
    }

    const poolCap = cap;
    if (poolCap !== null && poolCap !== undefined) {
      const poolUsed = (otherTotals[key] || 0) + value;
      if (poolUsed > poolCap) {
        const remaining = Math.max(0, poolCap - (otherTotals[key] || 0));
        return {
          ok: false,
          error: `${sellerLimitLabel(key)}: la suma asignada a vendedores (${poolUsed}) supera el límite del plan (${poolCap}). Máximo asignable a este vendedor: ${remaining}.`,
        };
      }
    }
  }

  return { ok: true, normalized };
}

async function mirrorAssignedLimits(
  dealerTenantId: string,
  sellerUserId: string,
  limits: AssignedSellerLimits,
  updatedBy: string
): Promise<void> {
  const ts = getFirestoreFieldValue().serverTimestamp();
  const payload = {
    assignedLimits: limits,
    limitsUpdatedAt: ts,
    limitsUpdatedBy: updatedBy,
    updatedAt: ts,
  };

  const linkId = `${dealerTenantId.trim()}_${sellerUserId.trim()}`;
  const linkRef = getDb().collection('dealer_seller_links').doc(linkId);
  const linkSnap = await linkRef.get();
  if (linkSnap.exists) {
    await linkRef.set(payload, { merge: true });
  }

  const nestedRef = getDb()
    .collection('tenants')
    .doc(dealerTenantId)
    .collection('sub_users')
    .doc(sellerUserId);
  const globalRef = getDb().collection('sub_users').doc(sellerUserId);

  await Promise.all([
    nestedRef.set(payload, { merge: true }),
    globalRef.set(payload, { merge: true }),
  ]);
}

export async function setSellerAssignedLimits(input: {
  dealerTenantId: string;
  sellerUserId: string;
  limits: Record<string, unknown>;
  updatedBy: string;
}): Promise<ValidateAssignedLimitsResult> {
  const existing = await getSellerAssignedLimits(input.dealerTenantId, input.sellerUserId);
  const merged = mergeAssignedSellerLimits(existing, input.limits);

  const validation = await validateAssignedLimitsForDealer(
    input.dealerTenantId,
    input.sellerUserId,
    merged
  );
  if (!validation.ok) return validation;

  const ts = getFirestoreFieldValue().serverTimestamp();
  await getDb()
    .collection('users')
    .doc(input.sellerUserId)
    .set(
      {
        assignedLimits: validation.normalized,
        limitsUpdatedAt: ts,
        limitsUpdatedBy: input.updatedBy,
        updatedAt: ts,
      },
      { merge: true }
    );

  await mirrorAssignedLimits(
    input.dealerTenantId,
    input.sellerUserId,
    validation.normalized,
    input.updatedBy
  );

  return validation;
}

export async function getSellerLimitsSummary(
  dealerTenantId: string,
  sellerUserId: string,
  sellerTenantId?: string
): Promise<SellerLimitsSummary> {
  const assigned = await getSellerAssignedLimits(dealerTenantId, sellerUserId);
  const usage = await getSellerUsage(dealerTenantId, sellerUserId, sellerTenantId);
  const planCaps = await getDealerPlanLimits(dealerTenantId);
  const effective: Partial<Record<SellerAssignableLimitKey, number | null>> = {};

  for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
    const plan = planCaps[key];
    const cap = assigned[key];
    if (cap !== undefined) {
      effective[key] = cap;
    } else if (plan !== null && plan !== undefined) {
      effective[key] = plan;
    } else {
      effective[key] = null;
    }
  }

  return { assigned, usage, planCaps, effective };
}

export type SellerAllocatedAction =
  | 'addVehicle'
  | 'createCampaign'
  | 'createPromotion'
  | 'addLead'
  | 'createAppointment';

const ACTION_TO_LIMIT: Record<SellerAllocatedAction, SellerAssignableLimitKey> = {
  addVehicle: 'maxInventory',
  createCampaign: 'maxCampaigns',
  createPromotion: 'maxPromotions',
  addLead: 'maxLeadsPerMonth',
  createAppointment: 'maxAppointmentsPerMonth',
};

export async function canSellerPerformAllocatedAction(params: {
  dealerTenantId: string;
  sellerUserId: string;
  sellerTenantId?: string;
  action: SellerAllocatedAction;
}): Promise<FeatureCheckResult> {
  const key = ACTION_TO_LIMIT[params.action];
  const summary = await getSellerLimitsSummary(
    params.dealerTenantId,
    params.sellerUserId,
    params.sellerTenantId
  );

  const assignedCap = summary.assigned[key];
  const current = summary.usage[key];
  const effectiveCap = summary.effective[key];

  if (assignedCap !== undefined) {
    if (current >= assignedCap) {
      return {
        allowed: false,
        reason: `Has alcanzado tu límite asignado de ${sellerLimitLabel(key).toLowerCase()} (${assignedCap}). Contacta a tu concesionario.`,
        limit: assignedCap,
        current,
        remaining: 0,
      };
    }
    return {
      allowed: true,
      limit: assignedCap,
      current,
      remaining: assignedCap - current,
    };
  }

  if (effectiveCap !== null && effectiveCap !== undefined) {
    if (current >= effectiveCap) {
      return {
        allowed: false,
        reason: `Límite de ${sellerLimitLabel(key).toLowerCase()} alcanzado (${effectiveCap}).`,
        limit: effectiveCap,
        current,
        remaining: 0,
      };
    }
    return {
      allowed: true,
      limit: effectiveCap,
      current,
      remaining: effectiveCap - current,
    };
  }

  return { allowed: true, current };
}

export async function getDealerLimitsPoolSummary(dealerTenantId: string): Promise<{
  planCaps: Partial<Record<SellerAssignableLimitKey, number | null>>;
  assignedTotals: AssignedSellerLimits;
  remainingPool: Partial<Record<SellerAssignableLimitKey, number | null>>;
}> {
  const planCaps = await getDealerPlanLimits(dealerTenantId);
  const assignedTotals = await sumAssignedLimitsForDealer(dealerTenantId);
  const remainingPool: Partial<Record<SellerAssignableLimitKey, number | null>> = {};

  for (const key of SELLER_ASSIGNABLE_LIMIT_KEYS) {
    const cap = planCaps[key];
    const assigned = assignedTotals[key] || 0;
    if (cap === null || cap === undefined) {
      remainingPool[key] = null;
    } else {
      remainingPool[key] = Math.max(0, cap - assigned);
    }
  }

  return { planCaps, assignedTotals, remainingPool };
}
