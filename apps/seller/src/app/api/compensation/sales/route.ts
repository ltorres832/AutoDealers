import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCompensationSettings, listSellerSales, computeSaleCompensation } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const settings = await getCompensationSettings(auth.tenantId);
    const sales = await listSellerSales(auth.tenantId, auth.userId, {
      status: status || undefined,
      limit: 200,
    });

    const rows = sales.map((sale) => {
      const calc = computeSaleCompensation(sale, settings.rates);
      return {
        id: sale.id,
        status: sale.status,
        salePrice: sale.salePrice ?? sale.vehiclePrice ?? sale.total ?? 0,
        vehicleId: sale.vehicleId,
        completedAt: sale.completedAt,
        createdAt: sale.createdAt,
        totalCommission: calc.totalCommission,
        bonusTotal: calc.bonusTotal,
        lines: calc.lines,
      };
    });

    return NextResponse.json({ sales: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[compensation/sales]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
