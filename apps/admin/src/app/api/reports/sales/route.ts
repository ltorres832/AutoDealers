export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { generateSalesReport } from '@autodealers/reports';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Para admin, generar reporte de todos los tenants
    // Para dealer/seller, generar reporte de su tenant
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
      
      // Obtener todas las ventas completadas
      const salesSnapshot = await db.collectionGroup('sales')
        .where('status', '==', 'completed')
        .get();
      
      let totalRevenue = 0;
      let totalSales = 0;
      const bySeller: Record<string, { count: number; revenue: number }> = {};
      const byMonth: Record<string, { count: number; revenue: number }> = {};
      
      salesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const saleDate = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
        
        if (saleDate >= startDate && saleDate <= endDate) {
          totalSales++;
          totalRevenue += data.price || 0;
          
          // Por vendedor
          const sellerId = data.sellerId || 'unknown';
          if (!bySeller[sellerId]) {
            bySeller[sellerId] = { count: 0, revenue: 0 };
          }
          bySeller[sellerId].count++;
          bySeller[sellerId].revenue += data.price || 0;
          
          // Por mes
          const monthKey = saleDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
          if (!byMonth[monthKey]) {
            byMonth[monthKey] = { count: 0, revenue: 0 };
          }
          byMonth[monthKey].count++;
          byMonth[monthKey].revenue += data.price || 0;
        }
      });
      
      const report = {
        total: totalSales,
        totalRevenue,
        bySeller,
        byMonth,
        averageSalePrice: totalSales > 0 ? totalRevenue / totalSales : 0,
        conversionRate: 0, // Se calcularía con leads
      };
      
      return NextResponse.json({ report });
    } else {
      // Para dealer/seller, usar el tenantId
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
      }
      
      const report = await generateSalesReport(auth.tenantId, {
        startDate,
        endDate,
      });

      return NextResponse.json({ report });
    }
  } catch (error: any) {
    console.error('Error generating sales report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        report: {
          total: 0,
          totalRevenue: 0,
          bySeller: {},
          byMonth: {},
          averageSalePrice: 0,
          conversionRate: 0,
        }
      },
      { status: 500 }
    );
  }
}




