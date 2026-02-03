// Reporte de rendimiento

import { getFirestore } from '@autodealers/core';
import { getLeads } from '@autodealers/crm';
import { getTenantSales } from '@autodealers/crm';
import { PerformanceReport, ReportFilters } from './types';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Genera reporte de rendimiento por vendedor
 */
export async function generatePerformanceReport(
  tenantId: string,
  sellerId: string,
  filters?: ReportFilters
): Promise<PerformanceReport> {
  // Obtener datos del vendedor
  const userDoc = await db.collection('users').doc(sellerId).get();
  const userData = userDoc.data();

  // Obtener leads asignados
  const leads = await getLeads(tenantId, {
    assignedTo: sellerId,
  });

  // Filtrar por fecha
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

  // Obtener citas
  const appointmentsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointments')
    .where('assignedTo', '==', sellerId)
    .get();

  // Obtener ventas
  const sales = await getTenantSales(tenantId, {
    startDate: filters?.startDate,
    endDate: filters?.endDate,
  });
  const sellerSales = sales.filter((sale) => sale.sellerId === sellerId);

  // Calcular estadísticas
  const leadsContacted = filteredLeads.filter(
    (lead) => lead.status !== 'new'
  ).length;
  const leadsQualified = filteredLeads.filter(
    (lead) => lead.status === 'qualified' || lead.status === 'appointment'
  ).length;

  const revenue = sellerSales.reduce((sum, sale) => sum + ((sale as any).price || (sale as any).salePrice || (sale as any).total || 0), 0);
  const conversionRate =
    filteredLeads.length > 0
      ? (sellerSales.length / filteredLeads.length) * 100
      : 0;

  // Calcular tiempo promedio de respuesta
  let totalResponseTime = 0;
  let responsesCount = 0;
  filteredLeads.forEach((lead) => {
    if (lead.interactions.length > 0) {
      const firstInteraction = lead.interactions[0];
      const responseTime =
        (firstInteraction.createdAt.getTime() - lead.createdAt.getTime()) /
        (1000 * 60 * 60);
      totalResponseTime += responseTime;
      responsesCount++;
    }
  });

  return {
    sellerId,
    sellerName: userData?.name || 'Desconocido',
    leadsAssigned: filteredLeads.length,
    leadsContacted,
    leadsQualified,
    appointments: appointmentsSnapshot.size,
    sales: sellerSales.length,
    revenue,
    conversionRate,
    averageResponseTime:
      responsesCount > 0 ? totalResponseTime / responsesCount : 0,
  };
}





