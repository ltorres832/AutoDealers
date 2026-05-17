export type ExpeditionStage =
  | 'intake'
  | 'documentation'
  | 'under_review'
  | 'decision'
  | 'closing'
  | 'closed';

const STAGE_LABELS: Record<ExpeditionStage, string> = {
  intake: 'Captación',
  documentation: 'Documentación',
  under_review: 'En análisis',
  decision: 'Decisión',
  closing: 'Cierre',
  closed: 'Cerrado',
};

/** Etiqueta legible de etapa de expediente — seguro para componentes cliente */
export function expeditionStageLabel(stage: ExpeditionStage | string | undefined): string {
  if (!stage) return '—';
  return STAGE_LABELS[stage as ExpeditionStage] || String(stage);
}
