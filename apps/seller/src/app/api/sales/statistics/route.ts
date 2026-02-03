import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSalesBySeller } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId || auth.role !== 'seller') {
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

    // Obtener ventas del vendedor
    const sales = await getSalesBySeller(
      auth.tenantId,
      auth.userId,
      startDate,
      endDate
    );

    // Filtrar solo ventas completadas
    const completedSales = sales.filter((sale) => sale.status === 'completed');

    let totalSales = 0;
    let totalRevenue = 0;

    completedSales.forEach((sale) => {
      totalSales++;
      totalRevenue += sale.salePrice || sale.total || 0;
    });

    // Calcular ventas por día (solo para semana y mes)
    const byDayMap: Record<string, { sales: number; revenue: number }> = {};
    
    if (period === 'week' || period === 'month') {
      completedSales.forEach((sale) => {
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

