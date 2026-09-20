import { NextRequest, NextResponse } from 'next/server';
import { authenticateV0Request, requireScope } from '@/lib/public-api-auth';
import { getTenantSales } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV0Request(request);
  if (!auth.ok) return auth.response;
  const denied = requireScope(auth.scopes, 'sales:read');
  if (denied) return denied;

  const sales = await getTenantSales(auth.tenantId);
  const limit = Math.min(100, Number(new URL(request.url).searchParams.get('limit') || 50));
  return NextResponse.json({
    data: sales.slice(0, limit).map((s) => ({
      id: s.id,
      status: s.status,
      salePrice: s.salePrice,
      total: s.total,
      sellerId: s.sellerId,
      vehicleId: s.vehicleId,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    })),
  });
}
