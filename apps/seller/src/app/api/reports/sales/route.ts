import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSalesBySeller } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

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

    const sales = await getSalesBySeller(auth.tenantId, auth.userId, startDate, endDate);
    const completedSales = sales.filter((s) => s.status === 'completed');

    const total = completedSales.length;
    const totalRevenue = completedSales.reduce((sum, sale) => sum + (sale.salePrice || sale.total || 0), 0);
    const averageSalePrice = total > 0 ? totalRevenue / total : 0;

    // Obtener leads para calcular conversión
    const { getLeads } = await import('@autodealers/crm');
    const leads = await getLeads(auth.tenantId, { assignedTo: auth.userId });
    const conversionRate = leads.length > 0 ? (total / leads.length) * 100 : 0;

    const report = {
      total,
      totalRevenue,
      averageSalePrice,
      conversionRate,
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



