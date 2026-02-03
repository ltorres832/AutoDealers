// Sistema de scoring avanzado de leads

import { getFirestore } from '@autodealers/core';
import { Lead, ScoreHistory } from './types';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface ScoringRule {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  conditions: ScoringCondition[];
  points: number;
  priority: number; // Orden de evaluación
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringCondition {
  field: 'source' | 'status' | 'interactions' | 'responseTime' | 'emailOpened' | 'linkClicked' | 'documentUploaded' | 'appointmentScheduled';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
  value: any;
}

export interface ScoringConfig {
  tenantId: string;
  enabled: boolean;
  autoCalculate: boolean;
  manualOverride: boolean;
  maxScore: number; // Default: 100
  rules: ScoringRule[];
  weights?: {
    automatic: number; // 0-1
    manual: number; // 0-1
  };
  updatedAt: Date;
}

/**
 * Calcula el score automático de un lead
 */
export async function calculateAutomaticScore(
  tenantId: string,
  lead: Lead
): Promise<number> {
  const config = await getScoringConfig(tenantId);
  
  if (!config.enabled || !config.autoCalculate) {
    return 0;
  }

  let score = 0;

  // Aplicar reglas de scoring
  const sortedRules = config.rules
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateScoringRule(lead, rule)) {
      score += rule.points;
    }
  }

  // Aplicar factores adicionales
  score += calculateSourceScore(lead.source);
  score += calculateInteractionScore(lead.interactions);
  score += calculateResponseTimeScore(lead);
  score += calculateAIClassificationScore(lead.aiClassification);

  // Limitar al máximo
  return Math.min(score, config.maxScore);
}

/**
 * Evalúa si una regla de scoring se cumple
 */
function evaluateScoringRule(lead: Lead, rule: ScoringRule): boolean {
  return rule.conditions.every(condition => {
    switch (condition.field) {
      case 'source':
        return condition.operator === 'equals' && lead.source === condition.value;
      case 'status':
        return condition.operator === 'equals' && lead.status === condition.value;
      case 'interactions':
        if (condition.operator === 'greaterThan') {
          return lead.interactions.length > condition.value;
        }
        return false;
      case 'responseTime':
        // Calcular tiempo de respuesta promedio
        return false; // TODO: Implementar
      case 'emailOpened':
        // Verificar si email fue abierto
        return false; // TODO: Implementar
      case 'linkClicked':
        // Verificar si link fue clickeado
        return false; // TODO: Implementar
      case 'documentUploaded':
        // Verificar si documento fue subido
        return lead.documents && lead.documents.length > 0;
      case 'appointmentScheduled':
        // Verificar si tiene cita programada
        return lead.status === 'appointment' || lead.status === 'test_drive';
      default:
        return false;
    }
  });
}

/**
 * Calcula score basado en fuente
 */
function calculateSourceScore(source: string): number {
  const sourceScores: Record<string, number> = {
    'web': 10,
    'whatsapp': 15,
    'facebook': 12,
    'instagram': 12,
    'email': 8,
    'phone': 20,
    'sms': 10,
  };
  return sourceScores[source] || 5;
}

/**
 * Calcula score basado en interacciones
 */
function calculateInteractionScore(interactions: any[]): number {
  if (!interactions || interactions.length === 0) return 0;
  
  let score = 0;
  score += interactions.length * 2; // 2 puntos por interacción
  
  // Bonus por múltiples interacciones
  if (interactions.length >= 5) score += 10;
  if (interactions.length >= 10) score += 15;
  
  return Math.min(score, 30);
}

/**
 * Calcula score basado en tiempo de respuesta
 */
function calculateResponseTimeScore(lead: Lead): number {
  // TODO: Implementar cálculo de tiempo de respuesta
  return 0;
}

/**
 * Calcula score basado en clasificación de IA
 */
function calculateAIClassificationScore(classification?: any): number {
  if (!classification) return 0;
  
  let score = 0;
  
  if (classification.priority === 'high') score += 20;
  else if (classification.priority === 'medium') score += 10;
  else if (classification.priority === 'low') score += 5;
  
  if (classification.sentiment === 'positive') score += 10;
  else if (classification.sentiment === 'negative') score -= 5;
  
  return score;
}

/**
 * Actualiza el score de un lead
 */
export async function updateLeadScore(
  tenantId: string,
  leadId: string,
  automaticScore: number,
  manualScore?: number,
  reason?: string,
  updatedBy?: string
): Promise<void> {
  const leadRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId);

  const leadDoc = await leadRef.get();
  if (!leadDoc.exists) {
    throw new Error('Lead not found');
  }

  const leadData = leadDoc.data() as Lead;
  const config = await getScoringConfig(tenantId);
  
  const weights = config.weights || { automatic: 0.7, manual: 0.3 };
  const combinedScore = manualScore !== undefined
    ? Math.round(automaticScore * weights.automatic + manualScore * weights.manual)
    : automaticScore;

  const scoreHistory: ScoreHistory = {
    score: automaticScore,
    type: 'automatic',
    reason,
    updatedBy,
    updatedAt: new Date(),
  };

  const currentHistory = leadData.score?.history || [];
  const newHistory = [...currentHistory, scoreHistory].slice(-50); // Mantener últimos 50

  await leadRef.update({
    score: {
      automatic: automaticScore,
      manual: manualScore,
      combined: combinedScore,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      history: newHistory.map(h => ({
        ...h,
        updatedAt: admin.firestore.Timestamp.fromDate(h.updatedAt),
      })),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Obtiene configuración de scoring
 */
export async function getScoringConfig(tenantId: string): Promise<ScoringConfig> {
  const configDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('scoring')
    .get();

  if (!configDoc.exists) {
    // Configuración por defecto
    return {
      tenantId,
      enabled: true,
      autoCalculate: true,
      manualOverride: true,
      maxScore: 100,
      rules: [],
      weights: {
        automatic: 0.7,
        manual: 0.3,
      },
      updatedAt: new Date(),
    };
  }

  const data = configDoc.data();
  return {
    ...data,
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as ScoringConfig;
}

/**
 * Guarda configuración de scoring
 */
export async function saveScoringConfig(
  tenantId: string,
  config: Partial<ScoringConfig>
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('scoring')
    .set({
      ...config,
      tenantId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}


