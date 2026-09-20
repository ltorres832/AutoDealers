/**
 * SLA helpers en el app dealer (cliente) — no importar el barrel @autodealers/crm
 * (arrastra módulos Node / crypto).
 */

export type CrmSlaConfig = {
  enabled: boolean;
  staleHoursNew: number;
  criticalMultiplier: number;
  staleHoursActive: number;
};

export const DEFAULT_CRM_SLA: CrmSlaConfig = {
  enabled: true,
  staleHoursNew: 24,
  criticalMultiplier: 2,
  staleHoursActive: 72,
};

type LeadTouch = {
  status?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastContactDate?: unknown;
  interactions?: Array<{ createdAt?: unknown; date?: unknown }>;
};

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
  if (typeof v === 'object') {
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

function leadLastTouchMs(lead: LeadTouch): number {
  const candidates: number[] = [];
  const lc = toMs(lead.lastContactDate);
  if (lc) candidates.push(lc);
  if (Array.isArray(lead.interactions)) {
    for (const it of lead.interactions) {
      const t = toMs(it?.createdAt ?? it?.date);
      if (t) candidates.push(t);
    }
  }
  const u = toMs(lead.updatedAt);
  if (u) candidates.push(u);
  const created = toMs(lead.createdAt);
  if (created) candidates.push(created);
  if (candidates.length) return Math.max(...candidates);
  return created ?? 0;
}

const TERMINAL = new Set(['closed', 'lost']);

export function computeLeadSlaSeverity(
  lead: LeadTouch,
  cfg: CrmSlaConfig
): 'ok' | 'warning' | 'critical' {
  if (!cfg.enabled) return 'ok';
  if (TERMINAL.has(String(lead.status || ''))) return 'ok';
  const hours = Math.max(0, (Date.now() - leadLastTouchMs(lead)) / 3600000);
  const warnHours = lead.status === 'new' ? cfg.staleHoursNew : cfg.staleHoursActive;
  const critHours = warnHours * cfg.criticalMultiplier;
  if (hours >= critHours) return 'critical';
  if (hours >= warnHours) return 'warning';
  return 'ok';
}

export function formatHoursSinceTouch(lead: LeadTouch): string {
  const h = Math.max(0, (Date.now() - leadLastTouchMs(lead)) / 3600000);
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}
