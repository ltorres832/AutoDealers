export type ExpeditionStage = 'intake' | 'documentation' | 'under_review' | 'decision' | 'closing' | 'closed';
/** Etiqueta legible de etapa de expediente — seguro para componentes cliente */
export declare function expeditionStageLabel(stage: ExpeditionStage | string | undefined): string;
