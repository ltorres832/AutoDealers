// Medición de uso mensual por tenant con límites de membresía,
// paquetes adicionales y facturación automática de excesos.
//
// Estructura: tenants/{tenantId}/usage/{YYYY-MM}
//   { voiceMinutes: 12, messages: 340, ..., extraUnits: { voiceMinutes: 100 } }
// Ledger de cargos: tenants/{tenantId}/usage_charges/{chargeId}

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import type { MembershipFeatures } from './types';
import {
  DEFAULT_OVERAGE_PRICES,
  getUsagePricingConfig,
  USAGE_METRIC_LABELS,
  type UsageMetric,
} from './usage-pricing-defaults';

function getDb() {
  return getFirestore();
}

export function currentUsagePeriod(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function usageDocRef(tenantId: string, period?: string) {
  return getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('usage')
    .doc(period || currentUsagePeriod());
}

/** Mapa métrica → clave de límite en MembershipFeatures */
const METRIC_LIMIT_KEYS: Record<UsageMetric, keyof MembershipFeatures> = {
  voiceMinutes: 'maxVoiceMinutesPerMonth',
  voiceOutboundCalls: 'maxVoiceOutboundCallsPerMonth',
  voiceInboundCalls: 'maxVoiceInboundCallsPerMonth',
  messages: 'maxMessagesPerMonth',
  aiResponses: 'maxAiResponsesPerMonth',
  emails: 'maxEmailsPerMonth',
  leads: 'maxLeadsPerMonth',
  appointments: 'maxAppointmentsPerMonth',
  storageGB: 'maxStorageGB',
};

export interface UsageMetricSnapshot {
  metric: UsageMetric;
  label: string;
  used: number;
  /** Límite del plan (null = ilimitado) */
  limit: number | null;
  /** Unidades extra compradas en paquetes este mes */
  extraUnits: number;
  /** Límite efectivo = límite + extras (null = ilimitado) */
  effectiveLimit: number | null;
  /** 0-100 (null si ilimitado) */
  percentUsed: number | null;
  overLimit: boolean;
}

export interface UsageSnapshot {
  tenantId: string;
  period: string;
  metrics: UsageMetricSnapshot[];
  overageBillingEnabled: boolean;
}

/** Incrementa el contador de una métrica en el período actual. */
export async function incrementUsage(
  tenantId: string,
  metric: UsageMetric,
  amount = 1
): Promise<void> {
  if (!tenantId || amount <= 0) return;
  const FieldValue = getFirestoreFieldValue();
  await usageDocRef(tenantId).set(
    {
      [metric]: FieldValue.increment(amount),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

/** Añade unidades extra (compra de paquete) al período actual. */
export async function addExtraUnits(
  tenantId: string,
  metric: UsageMetric,
  units: number
): Promise<void> {
  const FieldValue = getFirestoreFieldValue();
  await usageDocRef(tenantId).set(
    {
      extraUnits: { [metric]: FieldValue.increment(units) },
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

async function resolveFeatures(tenantId: string): Promise<MembershipFeatures | null> {
  try {
    const core = await import('@autodealers/core');
    const features = await (core as any).getTenantMembershipFeatures(tenantId);
    return (features as MembershipFeatures) || null;
  } catch (error) {
    console.error('[billing] Error resolviendo features del tenant:', error);
    return null;
  }
}

function limitFromFeatures(features: MembershipFeatures | null, metric: UsageMetric): number | null {
  if (!features) return null;
  const raw = features[METRIC_LIMIT_KEYS[metric]];
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Snapshot completo de uso del mes vs límites del plan. */
export async function getUsageSnapshot(tenantId: string, period?: string): Promise<UsageSnapshot> {
  const p = period || currentUsagePeriod();
  const [doc, features] = await Promise.all([
    usageDocRef(tenantId, p).get(),
    resolveFeatures(tenantId),
  ]);
  const data = doc.exists ? doc.data() || {} : {};
  const extras = (data.extraUnits || {}) as Record<string, number>;

  const metrics = (Object.keys(METRIC_LIMIT_KEYS) as UsageMetric[]).map((metric) => {
    const used = Number(data[metric] || 0);
    const limit = limitFromFeatures(features, metric);
    const extraUnits = Number(extras[metric] || 0);
    const effectiveLimit = limit === null ? null : limit + extraUnits;
    return {
      metric,
      label: USAGE_METRIC_LABELS[metric],
      used,
      limit,
      extraUnits,
      effectiveLimit,
      percentUsed:
        effectiveLimit === null || effectiveLimit === 0
          ? effectiveLimit === 0
            ? 100
            : null
          : Math.min(100, Math.round((used / effectiveLimit) * 100)),
      overLimit: effectiveLimit !== null && used > effectiveLimit,
    } as UsageMetricSnapshot;
  });

  return {
    tenantId,
    period: p,
    metrics,
    overageBillingEnabled: features?.overageBillingEnabled === true,
  };
}

export interface LimitCheckResult {
  allowed: boolean;
  /** Cuántas unidades del consumo solicitado exceden el límite */
  overageUnits: number;
  /** Si el exceso se facturará automáticamente */
  willBillOverage: boolean;
  reason?: string;
  used: number;
  effectiveLimit: number | null;
}

/**
 * Verifica si un consumo está dentro del límite.
 * Si el plan tiene overageBillingEnabled, permite el consumo y reporta el exceso a facturar.
 */
export async function assertWithinLimit(
  tenantId: string,
  metric: UsageMetric,
  amount = 1
): Promise<LimitCheckResult> {
  const [doc, features] = await Promise.all([
    usageDocRef(tenantId).get(),
    resolveFeatures(tenantId),
  ]);
  const data = doc.exists ? doc.data() || {} : {};
  const used = Number(data[metric] || 0);
  const extras = Number((data.extraUnits || {})[metric] || 0);
  const limit = limitFromFeatures(features, metric);
  const effectiveLimit = limit === null ? null : limit + extras;

  if (effectiveLimit === null) {
    return { allowed: true, overageUnits: 0, willBillOverage: false, used, effectiveLimit };
  }

  const projected = used + amount;
  if (projected <= effectiveLimit) {
    return { allowed: true, overageUnits: 0, willBillOverage: false, used, effectiveLimit };
  }

  const overageUnits = projected - Math.max(used, effectiveLimit);
  const overageAllowed = features?.overageBillingEnabled === true;

  if (overageAllowed) {
    return { allowed: true, overageUnits, willBillOverage: true, used, effectiveLimit };
  }

  return {
    allowed: false,
    overageUnits,
    willBillOverage: false,
    used,
    effectiveLimit,
    reason: `Límite mensual de ${USAGE_METRIC_LABELS[metric]} alcanzado (${used}/${effectiveLimit}). Mejora tu plan o compra un paquete adicional.`,
  };
}

// ============================================================
// Ledger de cargos por exceso (evidencia de facturación)
// ============================================================

export interface UsageOverageCharge {
  id: string;
  tenantId: string;
  period: string;
  metric: UsageMetric;
  units: number;
  unitPriceUsd: number;
  totalUsd: number;
  status: 'pending' | 'invoiced' | 'paid' | 'failed' | 'waived';
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

function chargesRef(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('usage_charges');
}

/**
 * Registra un cargo por exceso en el ledger (estado pending).
 * La facturación efectiva en Stripe la procesa el job de facturación.
 */
export async function recordOverageCharge(
  tenantId: string,
  metric: UsageMetric,
  units: number
): Promise<UsageOverageCharge | null> {
  if (units <= 0) return null;
  let pricing;
  try {
    pricing = await getUsagePricingConfig();
  } catch {
    pricing = { overages: DEFAULT_OVERAGE_PRICES, packs: [] };
  }
  const priceConfig = pricing.overages[metric] || DEFAULT_OVERAGE_PRICES[metric];
  if (!priceConfig?.enabled) return null;

  const now = new Date();
  const docRef = chargesRef(tenantId).doc();
  const totalUsd = Math.round(units * priceConfig.unitPriceUsd * 100) / 100;
  const charge: UsageOverageCharge = {
    id: docRef.id,
    tenantId,
    period: currentUsagePeriod(),
    metric,
    units,
    unitPriceUsd: priceConfig.unitPriceUsd,
    totalUsd,
    status: 'pending',
    description: `Exceso de ${USAGE_METRIC_LABELS[metric]}: ${units} ${priceConfig.unitLabel}(s) x $${priceConfig.unitPriceUsd}`,
    createdAt: now,
    updatedAt: now,
  };
  await docRef.set(JSON.parse(JSON.stringify(charge)));
  return charge;
}

export async function getUsageCharges(
  tenantId: string,
  options?: { period?: string; limit?: number }
): Promise<UsageOverageCharge[]> {
  let query: FirebaseFirestore.Query = chargesRef(tenantId).orderBy('createdAt', 'desc');
  if (options?.period) {
    query = chargesRef(tenantId).where('period', '==', options.period).orderBy('createdAt', 'desc');
  }
  const snap = await query.limit(options?.limit || 100).get();
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as UsageOverageCharge;
  });
}

export async function updateOverageChargeStatus(
  tenantId: string,
  chargeId: string,
  patch: Partial<Pick<UsageOverageCharge, 'status' | 'stripeInvoiceId' | 'stripeInvoiceUrl'>>
): Promise<void> {
  await chargesRef(tenantId)
    .doc(chargeId)
    .set(JSON.parse(JSON.stringify({ ...patch, updatedAt: new Date() })), { merge: true });
}

/**
 * Helper todo-en-uno: valida límite, incrementa el uso y registra el exceso si aplica.
 * Devuelve el resultado del check (allowed=false significa que la acción debe bloquearse).
 */
export async function consumeUsage(
  tenantId: string,
  metric: UsageMetric,
  amount = 1
): Promise<LimitCheckResult> {
  const check = await assertWithinLimit(tenantId, metric, amount);
  if (!check.allowed) return check;
  await incrementUsage(tenantId, metric, amount);
  if (check.willBillOverage && check.overageUnits > 0) {
    try {
      await recordOverageCharge(tenantId, metric, check.overageUnits);
    } catch (error) {
      console.error('[billing] Error registrando cargo por exceso:', error);
    }
  }
  return check;
}
