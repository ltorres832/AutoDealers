import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getTenantSales } from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';
import { getSellerNetworkActivity } from '@/lib/seller-network-activity';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';
    const sellerIdFilter = searchParams.get('sellerId') || undefined;

    const now = new Date();
    let startDate: Date;
    const endDate: Date = now;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    let tenantSales: Awaited<ReturnType<typeof getTenantSales>> = [];
    try {
      tenantSales = await getTenantSales(auth.tenantId, {
        startDate,
        endDate,
        status: 'completed',
      });
    } catch (e) {
      console.warn('sales/statistics getTenantSales', e);
    }

    let network: any = { sellers: [], sales: [] };
    try {
      network = await getSellerNetworkActivity(auth.tenantId, {
        userId: auth.userId,
        kinds: ['sales', 'sellers'],
        limitPerSeller: 100,
        sellerId: sellerIdFilter,
      });
    } catch (e) {
      console.warn('sales/statistics network', e);
    }

    const sellersMap: Record<string, string> = {};
    for (const s of network.sellers || []) {
      sellersMap[s.id] = s.name;
    }

    type SaleRow = {
      sellerId?: string;
      salePrice?: number;
      total?: number;
      createdAt: Date;
      id?: string;
    };

    const allSales: SaleRow[] = (tenantSales || []).map((s) => ({
      id: s.id,
      sellerId: s.sellerId,
      salePrice: s.salePrice || s.total || 0,
      total: s.total,
      createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt as any),
    }));

    const seen = new Set(allSales.map((s) => s.id).filter(Boolean) as string[]);
    for (const s of network.sales || []) {
      const createdAt = s.createdAt ? new Date(String(s.createdAt)) : new Date();
      if (createdAt < startDate || createdAt > endDate) continue;
      if (s.id && seen.has(s.id)) continue;
      if (s.id) seen.add(s.id);
      allSales.push({
        id: s.id,
        sellerId: s.ownerId || (s.sellerId as string),
        salePrice: Number(s.salePrice || s.total || s.price || 0),
        createdAt,
      });
      if (s.ownerId && s.ownerName) sellersMap[s.ownerId] = String(s.ownerName);
    }

    const missingIds = [
      ...new Set(
        allSales.map((s) => s.sellerId).filter((id): id is string => Boolean(id) && !sellersMap[id])
      ),
    ];
    try {
      const { FieldPath } = await import('firebase-admin/firestore');
      for (let i = 0; i < missingIds.length; i += 10) {
        const batch = missingIds.slice(i, i + 10);
        if (!batch.length) continue;
        const snap = await db.collection('users').where(FieldPath.documentId(), 'in', batch).get();
        snap.docs.forEach((doc) => {
          const data = doc.data();
          sellersMap[doc.id] = data?.name || data?.email || 'Sin nombre';
        });
      }
    } catch (e) {
      console.warn('sales/statistics seller names', e);
    }

    let filtered = allSales;
    if (sellerIdFilter) {
      filtered = allSales.filter((s) => s.sellerId === sellerIdFilter);
    }

    const bySellerMap: Record<string, { sales: number; revenue: number }> = {};
    let totalSales = 0;
    let totalRevenue = 0;

    filtered.forEach((sale) => {
      totalSales++;
      const rev = sale.salePrice || sale.total || 0;
      totalRevenue += rev;
      const sid = sale.sellerId || 'unknown';
      if (!bySellerMap[sid]) bySellerMap[sid] = { sales: 0, revenue: 0 };
      bySellerMap[sid].sales++;
      bySellerMap[sid].revenue += rev;
    });

    const bySeller = Object.entries(bySellerMap)
      .map(([sellerId, stats]) => ({
        sellerId,
        sellerName: sellersMap[sellerId] || (sellerId === 'unknown' ? 'Sin asignar' : 'Sin nombre'),
        sales: stats.sales,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const byDayMap: Record<string, { sales: number; revenue: number }> = {};
    if (period === 'week' || period === 'month') {
      filtered.forEach((sale) => {
        const dateKey = sale.createdAt.toISOString().split('T')[0];
        if (!byDayMap[dateKey]) byDayMap[dateKey] = { sales: 0, revenue: 0 };
        byDayMap[dateKey].sales++;
        byDayMap[dateKey].revenue += sale.salePrice || sale.total || 0;
      });
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, stats]) => ({ date, sales: stats.sales, revenue: stats.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      statistics: {
        period,
        totalSales,
        totalRevenue,
        bySeller,
        sellers: (network.sellers || []).map((s: any) => ({ id: s.id, name: s.name })),
        ...(byDay.length > 0 && { byDay }),
      },
    });
  } catch (error) {
    console.error('Error generating sales statistics:', error);
    return NextResponse.json({
      statistics: {
        period: 'day',
        totalSales: 0,
        totalRevenue: 0,
        bySeller: [],
        sellers: [],
      },
    });
  }
}
