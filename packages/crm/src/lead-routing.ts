/**
 * Enrutamiento de leads (reglas tipo CRM concesionario / BDC).
 * Documento: `tenants/{tenantId}/settings/crm_lead_routing`
 */

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { getUsersByTenant } from '@autodealers/core';
import type { LeadSource } from './types';

export type LeadRoutingStrategy = 'none' | 'round_robin';

export interface CrmSourceRuleEntry {
  /** Si es true y hay poolUserIds, solo ese pool recibe leads de esta fuente (round-robin propio). */
  useDedicatedPool: boolean;
  poolUserIds: string[];
}

export interface CrmLeadRoutingConfig {
  enabled: boolean;
  strategy: LeadRoutingStrategy;
  /** Pool global: vacío = todos los sellers activos del tenant (`users`). */
  poolUserIds: string[];
  /** Cursors por fuente de lead (clave = valor de `LeadSource`). */
  roundRobinCursors: Partial<Record<string, number>>;
  /** Reglas opcionales por canal. */
  sourceRules: Partial<Record<string, CrmSourceRuleEntry>>;
}

const ROUTING_DOC = 'crm_lead_routing';

function getDb() {
  return getFirestore();
}

function parseSourceRules(raw: unknown): Partial<Record<string, CrmSourceRuleEntry>> {
  const out: Partial<Record<string, CrmSourceRuleEntry>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const vo = v as Record<string, unknown>;
    const poolRaw = vo.poolUserIds;
    const poolUserIds = Array.isArray(poolRaw)
      ? poolRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
      : [];
    out[k] = {
      useDedicatedPool: vo.useDedicatedPool === true,
      poolUserIds,
    };
  }
  return out;
}

function parseCursors(d: Record<string, unknown>): Partial<Record<string, number>> {
  const cursors: Partial<Record<string, number>> = {};
  const mapRaw = d.roundRobinCursors;
  if (mapRaw && typeof mapRaw === 'object') {
    for (const [k, v] of Object.entries(mapRaw as Record<string, unknown>)) {
      if (typeof v === 'number' && v >= 0) cursors[k] = v;
    }
  }
  if (Object.keys(cursors).length === 0 && typeof d.roundRobinCursor === 'number' && d.roundRobinCursor >= 0) {
    cursors._migrated = d.roundRobinCursor;
  }
  return cursors;
}

export async function getCrmLeadRoutingConfig(tenantId: string): Promise<CrmLeadRoutingConfig> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc(ROUTING_DOC)
    .get();

  if (!snap.exists) {
    return {
      enabled: false,
      strategy: 'none',
      poolUserIds: [],
      roundRobinCursors: {},
      sourceRules: {},
    };
  }

  const d = snap.data() as Record<string, unknown>;
  const strategyRaw = d.strategy;
  const strategy: LeadRoutingStrategy =
    strategyRaw === 'round_robin' ? 'round_robin' : 'none';

  const poolRaw = d.poolUserIds;
  const poolUserIds = Array.isArray(poolRaw)
    ? poolRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
    : [];

  return {
    enabled: d.enabled === true,
    strategy,
    poolUserIds,
    roundRobinCursors: parseCursors(d),
    sourceRules: parseSourceRules(d.sourceRules),
  };
}

async function defaultActiveSellerIds(tenantId: string): Promise<string[]> {
  const users = await getUsersByTenant(tenantId);
  const ids = users
    .filter((u) => {
      if (u.role !== 'seller') return false;
      const st = (u as { status?: string }).status;
      return st === 'active' || st === undefined || st === 'pending';
    })
    .map((u) => u.id);
  return [...new Set(ids)].sort();
}

async function resolvePoolForSource(
  cfg: CrmLeadRoutingConfig,
  source: string,
  tenantId: string
): Promise<string[]> {
  const rule = cfg.sourceRules[source];
  if (rule?.useDedicatedPool === true && rule.poolUserIds.length > 0) {
    return [...new Set(rule.poolUserIds)].filter(Boolean).sort();
  }
  let pool = [...cfg.poolUserIds].filter(Boolean).sort();
  if (pool.length === 0) {
    pool = await defaultActiveSellerIds(tenantId);
  }
  return pool;
}

/**
 * Asignación automática cuando el lead no trae `assignedTo`.
 * @param leadSource canal del lead (web, facebook, etc.)
 */
export async function pickNextAssignedSellerForNewLead(
  tenantId: string,
  leadSource: LeadSource
): Promise<string | undefined> {
  const cfg = await getCrmLeadRoutingConfig(tenantId);
  if (!cfg.enabled || cfg.strategy !== 'round_robin') {
    return undefined;
  }

  const sourceKey = leadSource || 'web';
  const pool = await resolvePoolForSource(cfg, sourceKey, tenantId);
  if (!pool.length) {
    return undefined;
  }

  const db = getDb();
  const ref = db.collection('tenants').doc(tenantId).collection('settings').doc(ROUTING_DOC);

  const chosen = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.exists ? (doc.data() as Record<string, unknown>) : {};
    const cursors = { ...parseCursors(data) };
    const cur = typeof cursors[sourceKey] === 'number' && cursors[sourceKey]! >= 0 ? cursors[sourceKey]! : 0;
    const idx = cur % pool.length;
    const sellerId = pool[idx];
    cursors[sourceKey] = cur + 1;

    tx.set(
      ref,
      {
        roundRobinCursors: cursors,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
    return sellerId;
  });

  return chosen;
}
