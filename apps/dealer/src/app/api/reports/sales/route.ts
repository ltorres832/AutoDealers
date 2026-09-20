import { NextRequest, NextResponse } from 'next/server';
import { generateSalesReport } from '@autodealers/reports';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const scope = searchParams.get('scope') || 'global';
    const dealerId = searchParams.get('dealerId') || undefined;
    const sellerId = searchParams.get('sellerId') || undefined;

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

    const report = await generateSalesReport(auth.tenantId, {
      startDate,
      endDate,
      scope: scope as 'global' | 'dealer' | 'seller',
      dealerId,
      sellerId,
    });

    // Ampliar con ventas de vendedores vinculados (otros tenants)
    try {
      const { getSellerNetworkActivity } = await import('@/lib/seller-network-activity');
      const network = await getSellerNetworkActivity(auth.tenantId, {
        userId: auth.userId,
        kinds: ['sales', 'sellers'],
        limitPerSeller: 100,
        sellerId: scope === 'seller' ? sellerId : undefined,
      });
      let extraCount = 0;
      let extraRevenue = 0;
      const bySeller = { ...(report.bySeller || {}) } as Record<
        string,
        { count: number; revenue: number }
      >;
      for (const sale of network.sales) {
        const created = sale.createdAt ? new Date(String(sale.createdAt)) : null;
        if (created && (created < startDate || created > endDate)) continue;
        if (sale.sellerTenantId === auth.tenantId) continue; // ya en report
        const rev = Number(sale.salePrice || sale.total || sale.price || 0);
        extraCount++;
        extraRevenue += rev;
        const sid = String(sale.ownerId || 'unknown');
        if (!bySeller[sid]) bySeller[sid] = { count: 0, revenue: 0 };
        bySeller[sid].count++;
        bySeller[sid].revenue += rev;
      }
      return NextResponse.json({
        report: {
          ...report,
          total: (report.total || 0) + extraCount,
          totalRevenue: (report.totalRevenue || 0) + extraRevenue,
          bySeller,
        },
      });
    } catch (e) {
      console.warn('sales report network merge', e);
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return NextResponse.json({
      report: {
        total: 0,
        totalRevenue: 0,
        bySeller: {},
        byStatus: {},
      },
    });
  }
}



