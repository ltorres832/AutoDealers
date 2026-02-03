// Reporte de ventas

import { getTenantSales } from '@autodealers/crm';
import { getLeads } from '@autodealers/crm';
import { SalesReport, ReportFilters } from './types';

/**
 * Genera reporte de ventas
 */
export async function generateSalesReport(
  tenantId: string,
  filters?: ReportFilters
): Promise<SalesReport> {
  let sales = await getTenantSales(tenantId, {
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    status: 'completed',
  });

  // Filtrar por vendedor si se especifica
  if (filters?.sellerId) {
    sales = sales.filter((sale) => sale.sellerId === filters.sellerId);
  }

  // Filtrar por dealer si se especifica (necesitamos obtener las ventas de los sellers del dealer)
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
      
      // Filtrar ventas por sellers del dealer
      sales = sales.filter((sale) => sellerIds.includes(sale.sellerId));
    }
    // Si el dealerId es el mismo que tenantId, ya tenemos las ventas correctas
  }

  const bySeller: Record<string, { count: number; revenue: number }> = {};
  const byMonth: Record<string, { count: number; revenue: number }> = {};

  let totalRevenue = 0;

  sales.forEach((sale: any) => {
    totalRevenue += (sale as any).price || (sale as any).salePrice || (sale as any).total || 0;

    // Por vendedor
    if (!bySeller[sale.sellerId]) {
      bySeller[sale.sellerId] = { count: 0, revenue: 0 };
    }
    bySeller[sale.sellerId].count++;
    bySeller[sale.sellerId].revenue += (sale as any).price || (sale as any).salePrice || (sale as any).total || 0;

    // Por mes
    const monthKey = sale.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { count: 0, revenue: 0 };
    }
    byMonth[monthKey].count++;
    byMonth[monthKey].revenue += (sale as any).price || (sale as any).salePrice || (sale as any).total || 0;
  });

  // Obtener leads para calcular conversión
  const leads = await getLeads(tenantId);
  const closedLeads = leads.filter((lead) => lead.status === 'closed').length;
  const conversionRate =
    closedLeads > 0 ? (sales.length / closedLeads) * 100 : 0;

  return {
    total: sales.length,
    totalRevenue,
    bySeller,
    byMonth,
    averageSalePrice:
      sales.length > 0 ? totalRevenue / sales.length : 0,
    conversionRate,
  };
}
