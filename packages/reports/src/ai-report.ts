// Reporte de IA

import { getFirestore } from '@autodealers/core';
import { getMessagesByChannel } from '@autodealers/crm';
import { getLeads } from '@autodealers/crm';
import { AIReport, ReportFilters } from './types';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Genera reporte de IA
 */
export async function generateAIReport(
  tenantId: string,
  filters?: ReportFilters
): Promise<AIReport> {
  // Obtener mensajes generados por IA
  const messages = await getMessagesByChannel(tenantId, 'whatsapp', 10000);
  const aiMessages = messages.filter((msg) => msg.aiGenerated);

  // Obtener leads clasificados por IA
  const leads = await getLeads(tenantId);
  const classifiedLeads = leads.filter(
    (lead) => lead.aiClassification !== undefined
  );

  // Obtener posts generados por IA
  const postsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('social_posts')
    .where('aiGenerated', '==', true)
    .get();

  // Calcular confianza promedio
  const confidences = classifiedLeads
    .map((lead: any) => (lead.aiClassification?.confidence || (lead.aiClassification as any)?.confidence || 0))
    .filter((c: number) => c > 0);
  const averageConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  // Calcular tasa de aprobación (simplificado)
  const approvedMessages = aiMessages.filter(
    (msg) => msg.status === 'sent' || msg.status === 'delivered'
  );
  const approvalRate =
    aiMessages.length > 0
      ? (approvedMessages.length / aiMessages.length) * 100
      : 0;

  return {
    responsesGenerated: aiMessages.length,
    leadsClassified: classifiedLeads.length,
    postsCreated: postsSnapshot.size,
    averageConfidence,
    approvalRate,
  };
}

