export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAffiliateAuth } from '@/lib/affiliate-auth';
import { getAffiliatePartner, buildAffiliateReferralLink } from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await verifyAffiliateAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const affiliate = await getAffiliatePartner(auth.affiliateId);
  if (!affiliate) {
    return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    affiliate: {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      referralCode: affiliate.referralCode,
      referralLink: buildAffiliateReferralLink(affiliate.referralCode),
      status: affiliate.status,
    },
  });
}
