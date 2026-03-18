export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { generateLeadsReport } from '@autodealers/reports';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calcular fechas según período
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Si es admin, generar reporte global
    // Si no, generar reporte del tenant
    if (auth.role === 'admin') {
      // Para admin, generar reporte de todos los tenants
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      
      // Obtener todos los leads
      const leadsSnapshot = await db.collectionGroup('leads').get();
      
      let totalLeads = 0;
      const bySource: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byMonth: Record<string, number> = {};
      
      leadsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const leadDate = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
        
        if (leadDate >= startDate && leadDate <= endDate) {
          totalLeads++;
          
          // Por fuente
          const source = data.source || 'unknown';
          bySource[source] = (bySource[source] || 0) + 1;
          
          // Por estado
          const status = data.status || 'new';
          byStatus[status] = (byStatus[status] || 0) + 1;
          
          // Por mes
          const monthKey = leadDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
          byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        }
      });
      
      const report = {
        total: totalLeads,
        bySource,
        byStatus,
        byMonth,
        conversionRate: 0, // Se calcularía con ventas
      };
      
      return NextResponse.json({ report });
    } else {
      // Para dealer/seller, usar el tenantId
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
      }
      
      const report = await generateLeadsReport(auth.tenantId, {
        startDate,
        endDate,
      });

      // Obtener ventas para calcular tasa de conversión y datos de ventas
      const { getTenantSales } = await import('@autodealers/crm');
      const sales = await getTenantSales(auth.tenantId, {
        startDate,
        endDate,
        status: 'completed',
      });

      // Obtener leads para datos detallados
      const { getLeads } = await import('@autodealers/crm');
      const leads = await getLeads(auth.tenantId);

      // Calcular datos para gráficos
      const leadsByDay: Record<string, number> = {};
      const salesByDay: Record<string, { amount: number; count: number }> = {};
      const leadsBySource: Record<string, number> = {};
      const leadsByStatus: Record<string, number> = {};
      const salesBySeller: Record<string, number> = {};

      // Procesar leads
      leads.forEach((lead: any) => {
        const leadDate = lead.createdAt instanceof Date 
          ? lead.createdAt 
          : (lead.createdAt as any)?.toDate?.() 
            ? (lead.createdAt as any).toDate() 
            : new Date(lead.createdAt);
        
        if (leadDate >= startDate && leadDate <= endDate) {
          const dateKey = leadDate.toISOString().split('T')[0];
          leadsByDay[dateKey] = (leadsByDay[dateKey] || 0) + 1;
          
          const source = lead.source || 'unknown';
          leadsBySource[source] = (leadsBySource[source] || 0) + 1;
          
          const status = lead.status || 'new';
          leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
        }
      });

      // Procesar ventas
      sales.forEach((sale: any) => {
        const saleDate = sale.createdAt instanceof Date 
          ? sale.createdAt 
          : (sale.createdAt as any)?.toDate?.() 
            ? (sale.createdAt as any).toDate() 
            : new Date(sale.createdAt);
        
        const dateKey = saleDate.toISOString().split('T')[0];
        if (!salesByDay[dateKey]) {
          salesByDay[dateKey] = { amount: 0, count: 0 };
        }
        salesByDay[dateKey].amount += sale.price || 0;
        salesByDay[dateKey].count += 1;

        if (sale.sellerId) {
          salesBySeller[sale.sellerId] = (salesBySeller[sale.sellerId] || 0) + (sale.price || 0);
        }
      });

      // Generar arrays para gráficos
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysArray = Array.from({ length: Math.min(daysDiff, 30) }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const leadsData = daysArray.map(date => ({
        date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        count: leadsByDay[date] || 0,
      }));

      const salesData = daysArray.map(date => ({
        date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        amount: salesByDay[date]?.amount || 0,
        count: salesByDay[date]?.count || 0,
      }));

      const leadsBySourceData = Object.entries(leadsBySource).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      const leadsByStatusData = Object.entries(leadsByStatus).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // Obtener nombres de vendedores
      const sellerNames: Record<string, string> = {};
      try {
        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        for (const sellerId of Object.keys(salesBySeller)) {
          const sellerDoc = await db.collection('users').doc(sellerId).get();
          if (sellerDoc.exists) {
            sellerNames[sellerId] = sellerDoc.data()?.name || sellerId;
          } else {
            sellerNames[sellerId] = sellerId;
          }
        }
      } catch (err) {
        console.warn('Error fetching seller names:', err);
      }

      const salesBySellerData = Object.entries(salesBySeller).map(([sellerId, value]) => ({
        name: sellerNames[sellerId] || sellerId,
        value,
      }));

      // Calcular tasa de conversión
      const totalLeads = leads.filter((l: any) => {
        const leadDate = l.createdAt instanceof Date 
          ? l.createdAt 
          : (l.createdAt as any)?.toDate?.() 
            ? (l.createdAt as any).toDate() 
            : new Date(l.createdAt);
        return leadDate >= startDate && leadDate <= endDate;
      }).length;
      
      const conversionRate = totalLeads > 0 ? (sales.length / totalLeads) * 100 : 0;

      return NextResponse.json({
        leads: leadsData,
        sales: salesData,
        leadsBySource: leadsBySourceData,
        leadsByStatus: leadsByStatusData,
        salesBySeller: salesBySellerData,
        conversionRate,
      });
    }
  } catch (error: any) {
    console.error('Error generating leads report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        report: {
          total: 0,
          bySource: {},
          byStatus: {},
          byMonth: {},
          conversionRate: 0,
        }
      },
      { status: 500 }
    );
  }
}
