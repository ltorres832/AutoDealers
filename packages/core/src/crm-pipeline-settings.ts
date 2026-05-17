import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

/** Estados de lead alineados con `@autodealers/crm` / Firestore. */
export const CRM_PIPELINE_STATUS_KEYS = [
  'new',
  'contacted',
  'qualified',
  'pre_qualified',
  'appointment',
  'test_drive',
  'negotiation',
  'closed',
  'lost',
] as const;

export type CrmPipelineStatusKey = (typeof CRM_PIPELINE_STATUS_KEYS)[number];

export interface CrmPipelineStageRow {
  status: CrmPipelineStatusKey;
  label: string;
  /** Clave visual predefinida (p. ej. blue, yellow) — la UI mapea a clases Tailwind */
  color: string;
  order: number;
}

export interface CrmPipelineSettings {
  enabled: boolean;
  stages: CrmPipelineStageRow[];
}

const DOC_ID = 'crm_pipeline';

const DEFAULT_STAGES: CrmPipelineStageRow[] = [
  { status: 'new', label: 'Nuevos', color: 'blue', order: 0 },
  { status: 'contacted', label: 'Contactados', color: 'yellow', order: 1 },
  { status: 'qualified', label: 'Calificados', color: 'green', order: 2 },
  { status: 'pre_qualified', label: 'Pre-Calificados', color: 'purple', order: 3 },
  { status: 'appointment', label: 'Citas', color: 'indigo', order: 4 },
  { status: 'test_drive', label: 'Pruebas de manejo', color: 'pink', order: 5 },
  { status: 'negotiation', label: 'Negociación', color: 'orange', order: 6 },
  { status: 'closed', label: 'Cerrados', color: 'gray', order: 7 },
  { status: 'lost', label: 'Perdidos', color: 'red', order: 8 },
];

export const DEFAULT_CRM_PIPELINE_SETTINGS: CrmPipelineSettings = {
  enabled: true,
  stages: DEFAULT_STAGES,
};

const COLOR_KEYS = new Set([
  'blue',
  'yellow',
  'green',
  'purple',
  'indigo',
  'pink',
  'orange',
  'gray',
  'red',
]);

const STATUS_SET = new Set<string>(CRM_PIPELINE_STATUS_KEYS);

function clampOrder(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.floor(n)));
}

export function normalizeCrmPipelineSettings(raw: unknown): CrmPipelineSettings {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const enabled = d.enabled !== false;

  let stages: CrmPipelineStageRow[] = [];
  if (Array.isArray(d.stages)) {
    for (const row of d.stages) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const status = typeof r.status === 'string' && STATUS_SET.has(r.status) ? r.status : null;
      if (!status) continue;
      const label =
        typeof r.label === 'string' && r.label.trim() ? r.label.trim().slice(0, 80) : status;
      const color =
        typeof r.color === 'string' && COLOR_KEYS.has(r.color) ? r.color : 'gray';
      const order = clampOrder(Number(r.order), 99);
      stages.push({ status: status as CrmPipelineStatusKey, label, color, order });
    }
  }

  if (stages.length === 0) {
    stages = DEFAULT_STAGES.map((s) => ({ ...s }));
  }

  const byStatus = new Map(stages.map((s) => [s.status, s]));
  for (const def of DEFAULT_STAGES) {
    if (!byStatus.has(def.status)) {
      stages.push({ ...def });
    }
  }
  stages.sort((a, b) => a.order - b.order || CRM_PIPELINE_STATUS_KEYS.indexOf(a.status) - CRM_PIPELINE_STATUS_KEYS.indexOf(b.status));

  return { enabled, stages };
}

export async function getCrmPipelineSettings(): Promise<CrmPipelineSettings> {
  const snap = await getFirestore().collection('system_settings').doc(DOC_ID).get();
  if (!snap.exists) {
    return { ...DEFAULT_CRM_PIPELINE_SETTINGS, stages: DEFAULT_STAGES.map((s) => ({ ...s })) };
  }
  return normalizeCrmPipelineSettings(snap.data());
}

export async function saveCrmPipelineSettings(
  data: CrmPipelineSettings,
  meta: { userId: string }
): Promise<void> {
  const normalized = normalizeCrmPipelineSettings(data);
  await getFirestore()
    .collection('system_settings')
    .doc(DOC_ID)
    .set(
      {
        ...normalized,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: meta.userId,
      },
      { merge: true }
    );
}
