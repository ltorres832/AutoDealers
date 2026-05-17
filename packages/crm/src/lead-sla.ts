/**
 * SLA de seguimiento de leads (alertas “sin contacto”).
 * Documento: `tenants/{tenantId}/settings/crm_sla`
 */

import { getFirestore } from '@autodealers/shared';
import type { Lead, LeadStatus } from './types';

const SLA_DOC = 'crm_sla';

function getDb() {
  return getFirestore();
}

export interface CrmSlaConfig {
  enabled: boolean;
  /** Horas sin tocar un lead en estado "new" → advertencia */
  staleHoursNew: number;
  /** Horas sin tocar → crítico (normalmente 2× el umbral de advertencia si no se define aparte) */
  criticalMultiplier: number;
  /** Horas sin tocar leads ya trabajados (contacted, qualified, etc.) */
  staleHoursActive: number;
}

export const DEFAULT_CRM_SLA: CrmSlaConfig = {
  enabled: true,
  staleHoursNew: 24,
  criticalMultiplier: 2,
  staleHoursActive: 72,
};

export async function getCrmSlaConfig(tenantId: string): Promise<CrmSlaConfig> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc(SLA_DOC)
    .get();

  if (!snap.exists) {
    return { ...DEFAULT_CRM_SLA };
  }

  const d = snap.data() as Record<string, unknown>;
  const staleHoursNew =
    typeof d.staleHoursNew === 'number' && d.staleHoursNew > 0 ? Math.min(720, d.staleHoursNew) : DEFAULT_CRM_SLA.staleHoursNew;
  const staleHoursActive =
    typeof d.staleHoursActive === 'number' && d.staleHoursActive > 0
      ? Math.min(720, d.staleHoursActive)
      : DEFAULT_CRM_SLA.staleHoursActive;
  const criticalMultiplier =
    typeof d.criticalMultiplier === 'number' && d.criticalMultiplier >= 1.1 && d.criticalMultiplier <= 5
      ? d.criticalMultiplier
      : DEFAULT_CRM_SLA.criticalMultiplier;

  return {
    enabled: d.enabled !== false,
    staleHoursNew,
    staleHoursActive,
    criticalMultiplier,
  };
}

function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === 'object' && v !== null) {
    const any = v as { toMillis?: () => number; toDate?: () => Date };
    if (typeof any.toMillis === 'function') {
      const t = any.toMillis();
      return Number.isFinite(t) ? t : null;
    }
    if (typeof any.toDate === 'function') {
      const t = any.toDate().getTime();
      return Number.isFinite(t) ? t : null;
    }
  }
  return null;
}

/** Último “toque” del lead: último contacto, última interacción, actualización o creación. */
export function leadLastTouchMs(lead: Pick<Lead, 'createdAt' | 'updatedAt' | 'lastContactDate' | 'interactions'>): number {
  const candidates: number[] = [];
  const lc = toMs(lead.lastContactDate as unknown);
  if (lc) candidates.push(lc);
  const interactions = lead.interactions;
  if (Array.isArray(interactions) && interactions.length > 0) {
    const last = interactions[interactions.length - 1];
    const ic = toMs(last?.createdAt as unknown);
    if (ic) candidates.push(ic);
  }
  const u = toMs(lead.updatedAt as unknown);
  if (u) candidates.push(u);
  const created = toMs(lead.createdAt as unknown);
  if (created) candidates.push(created);
  if (candidates.length) return Math.max(...candidates);
  return created ?? 0;
}

export type LeadSlaSeverity = 'ok' | 'warning' | 'critical';

const TERMINAL: LeadStatus[] = ['closed', 'lost'];

/**
 * Severidad visual para listas / Kanban (no persiste en Firestore).
 */
export function computeLeadSlaSeverity(
  lead: Pick<Lead, 'status' | 'createdAt' | 'updatedAt' | 'lastContactDate' | 'interactions'>,
  cfg: CrmSlaConfig
): LeadSlaSeverity {
  if (!cfg.enabled) return 'ok';
  const st = lead.status as LeadStatus;
  if (TERMINAL.includes(st)) return 'ok';

  const ref = leadLastTouchMs(lead);
  const hours = Math.max(0, (Date.now() - ref) / 3600000);

  const warnHours = st === 'new' ? cfg.staleHoursNew : cfg.staleHoursActive;
  const critHours = warnHours * cfg.criticalMultiplier;

  if (hours >= critHours) return 'critical';
  if (hours >= warnHours) return 'warning';
  return 'ok';
}

export function formatHoursSinceTouch(lead: Pick<Lead, 'createdAt' | 'updatedAt' | 'lastContactDate' | 'interactions'>): string {
  const ref = leadLastTouchMs(lead);
  const h = Math.max(0, (Date.now() - ref) / 3600000);
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}
