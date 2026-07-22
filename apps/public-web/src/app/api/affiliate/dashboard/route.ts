export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAffiliateAuth } from '@/lib/affiliate-auth';
import { getAffiliateDashboardData } from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await verifyAffiliateAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const dashboard = await getAffiliateDashboardData(auth.affiliateId);
  if (!dashboard) {
    return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    ...dashboard,
    affiliate: {
      id: dashboard.affiliate.id,
      name: dashboard.affiliate.name,
      email: dashboard.affiliate.email,
      referralCode: dashboard.affiliate.referralCode,
      commissionSeller: dashboard.affiliate.commissionSeller,
      commissionDealerBasic: dashboard.affiliate.commissionDealerBasic,
      commissionDealerOther: dashboard.affiliate.commissionDealerOther,
      commissionDealer: dashboard.affiliate.commissionDealer,
    },
  });
}
