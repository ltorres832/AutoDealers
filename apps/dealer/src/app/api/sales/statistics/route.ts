import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantSales } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Obtener todas las ventas del período
    const sales = await getTenantSales(auth.tenantId, {
      startDate,
      endDate,
      status: 'completed',
    });

    // Obtener información de vendedores
    const sellerIds = [...new Set(sales.map((sale) => sale.sellerId).filter(Boolean))];
    const sellersMap: Record<string, string> = {};

    if (sellerIds.length > 0) {
      // Firestore limita 'in' a 10 elementos, así que hacemos múltiples consultas si es necesario
      const batchSize = 10;
      const sellerBatches = [];
      for (let i = 0; i < sellerIds.length; i += batchSize) {
        sellerBatches.push(sellerIds.slice(i, i + batchSize));
      }

      for (const batch of sellerBatches) {
        const sellersSnapshot = await db
          .collection('users')
          .where('__name__', 'in', batch)
          .get();

        sellersSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          sellersMap[doc.id] = data?.name || data?.email || 'Sin nombre';
        });
      }
    }

    // Calcular estadísticas por vendedor
    const bySellerMap: Record<string, { sales: number; revenue: number }> = {};
    let totalSales = 0;
    let totalRevenue = 0;

    sales.forEach((sale) => {
      totalSales++;
      totalRevenue += sale.salePrice || sale.total || 0;

      if (!bySellerMap[sale.sellerId]) {
        bySellerMap[sale.sellerId] = { sales: 0, revenue: 0 };
      }
      bySellerMap[sale.sellerId].sales++;
      bySellerMap[sale.sellerId].revenue += sale.salePrice || sale.total || 0;
    });

    const bySeller = Object.entries(bySellerMap).map(([sellerId, stats]) => ({
      sellerId,
      sellerName: sellersMap[sellerId] || 'Sin nombre',
      sales: stats.sales,
      revenue: stats.revenue,
    }));

    // Calcular ventas por día (solo para semana y mes)
    const byDayMap: Record<string, { sales: number; revenue: number }> = {};
    
    if (period === 'week' || period === 'month') {
      sales.forEach((sale) => {
        const saleDate = sale.createdAt;
        const dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!byDayMap[dateKey]) {
          byDayMap[dateKey] = { sales: 0, revenue: 0 };
        }
        byDayMap[dateKey].sales++;
        byDayMap[dateKey].revenue += sale.salePrice || sale.total || 0;
      });
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, stats]) => ({
        date,
        sales: stats.sales,
        revenue: stats.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const statistics = {
      period,
      totalSales,
      totalRevenue,
      bySeller,
      ...(byDay.length > 0 && { byDay }),
    };

    return NextResponse.json({ statistics });
  } catch (error) {
    console.error('Error generating sales statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

