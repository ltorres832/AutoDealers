export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getSellerNetworkActivity,
  type NetworkActivityKind,
} from '@/lib/seller-network-activity';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kindsParam = searchParams.get('kinds');
    const kinds = kindsParam
      ? (kindsParam.split(',').map((k) => k.trim()).filter(Boolean) as NetworkActivityKind[])
      : undefined;
    const dealerId = searchParams.get('dealerId') || undefined;
    const sellerId = searchParams.get('sellerId') || undefined;
    const limit = Number(searchParams.get('limit') || '25');

    const data = await getSellerNetworkActivity(auth.tenantId, {
      userId: auth.userId,
      dealerIds: dealerId ? [dealerId] : undefined,
      kinds,
      limitPerSeller: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25,
      sellerId: sellerId || undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('network-activity GET', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        sellers: [],
        leads: [],
        sales: [],
        appointments: [],
        campaigns: [],
        promotions: [],
        social: [],
        summaryBySeller: [],
      },
      { status: 500 }
    );
  }
}
