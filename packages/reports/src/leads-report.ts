// Reporte de leads

import { getLeads } from '@autodealers/crm';
import { LeadsReport, ReportFilters } from './types';

/**
 * Genera reporte de leads
 */
export async function generateLeadsReport(
  tenantId: string,
  filters?: ReportFilters
): Promise<LeadsReport> {
  const leads = await getLeads(tenantId, {
    limit: 10000, // Obtener todos
  });

  // Filtrar por fecha si se especifica
  let filteredLeads = leads;
  if (filters?.startDate || filters?.endDate) {
    filteredLeads = leads.filter((lead) => {
      const leadDate = lead.createdAt;
      if (filters.startDate && leadDate < filters.startDate) {
        return false;
      }
      if (filters.endDate && leadDate > filters.endDate) {
        return false;
      }
      return true;
    });
  }

  // Filtrar por usuario si se especifica
  if (filters?.userId) {
    filteredLeads = filteredLeads.filter(
      (lead) => lead.assignedTo === filters.userId
    );
  }

  // Filtrar por vendedor si se especifica
  if (filters?.sellerId) {
    filteredLeads = filteredLeads.filter(
      (lead) => lead.assignedTo === filters.sellerId
    );
  }

  // Filtrar por dealer si se especifica (necesitamos obtener los leads de los sellers del dealer)
  if (filters?.scope === 'dealer' && filters?.dealerId) {
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    
    // Si el dealerId es diferente al tenantId, obtener sellers del dealer
    if (filters.dealerId !== tenantId) {
      // Obtener todos los sellers del dealer
      const sellersSnapshot = await db
        .collection('users')
        .where('dealerId', '==', filters.dealerId)
        .where('role', '==', 'seller')
        .get();
      
      const sellerIds = sellersSnapshot.docs.map((doc) => doc.id);
      
      // Filtrar leads por sellers del dealer
      filteredLeads = filteredLeads.filter(
        (lead) => lead.assignedTo && sellerIds.includes(lead.assignedTo)
      );
    }
    // Si el dealerId es el mismo que tenantId, ya tenemos los leads correctos
  }

  // Calcular estadísticas
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byAssignedTo: Record<string, number> = {};

  let totalResponseTime = 0;
  let responsesCount = 0;

  filteredLeads.forEach((lead) => {
    // Por estado
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;

    // Por fuente
    bySource[lead.source] = (bySource[lead.source] || 0) + 1;

    // Por asignado
    const assigned = lead.assignedTo || 'sin_asignar';
    byAssignedTo[assigned] = (byAssignedTo[assigned] || 0) + 1;

    // Tiempo de respuesta (simplificado)
    if (lead.interactions.length > 0) {
      const firstInteraction = lead.interactions[0];
      const responseTime =
        (firstInteraction.createdAt.getTime() - lead.createdAt.getTime()) /
        (1000 * 60 * 60); // horas
      totalResponseTime += responseTime;
      responsesCount++;
    }
  });

  // Calcular tasa de conversión
  const closedLeads = filteredLeads.filter(
    (lead) => lead.status === 'closed'
  ).length;
  const conversionRate =
    filteredLeads.length > 0
      ? (closedLeads / filteredLeads.length) * 100
      : 0;

  return {
    total: filteredLeads.length,
    byStatus,
    bySource,
    byAssignedTo,
    conversionRate,
    averageResponseTime:
      responsesCount > 0 ? totalResponseTime / responsesCount : 0,
  };
}



