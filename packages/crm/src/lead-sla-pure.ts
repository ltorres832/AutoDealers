/**
 * SLA helpers puros (sin Firestore) — seguros para importar en componentes cliente.
 */

import type { Lead, LeadStatus } from './types';

export interface CrmSlaConfig {
  enabled: boolean;
  staleHoursNew: number;
  criticalMultiplier: number;
  staleHoursActive: number;
}

export const DEFAULT_CRM_SLA: CrmSlaConfig = {
  enabled: true,
  staleHoursNew: 24,
  criticalMultiplier: 2,
  staleHoursActive: 72,
};

function toMs(v: unknown): number | null {
  if (!v) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().getTime();
    } catch {
      return null;
    }
  }
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function leadLastTouchMs(
  lead: Pick<Lead, 'createdAt' | 'updatedAt' | 'lastContactDate' | 'interactions'>
): number {
  const candidates: number[] = [];
  const lastContact = toMs(lead.lastContactDate as unknown);
  if (lastContact) candidates.push(lastContact);
  const interactions = Array.isArray(lead.interactions) ? lead.interactions : [];
  for (const it of interactions) {
    const t = toMs((it as { date?: unknown; createdAt?: unknown })?.date ?? (it as any)?.createdAt);
    if (t) candidates.push(t);
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

export function formatHoursSinceTouch(
  lead: Pick<Lead, 'createdAt' | 'updatedAt' | 'lastContactDate' | 'interactions'>
): string {
  const ref = leadLastTouchMs(lead);
  const h = Math.max(0, (Date.now() - ref) / 3600000);
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}
