export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  listAffiliatePartners,
  createAffiliatePartner,
  buildAffiliateReferralLink,
  formatAffiliatePayoutProfileSummary,
  sendAffiliateRegistrationWelcomeEmail,
  notifyPlatformAdminsOfRegistration,
} from '@autodealers/core';
import { buildPublicWebUrl } from '@autodealers/shared/platform-urls';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const affiliates = await listAffiliatePartners();
    const enriched = affiliates.map((a) => ({
      ...a,
      referralLink: buildAffiliateReferralLink(a.referralCode),
      payoutProfileSummary: formatAffiliatePayoutProfileSummary(a.payoutProfile),
      stripeConnectAccountId: a.stripeConnectAccountId ?? null,
      stripeConnectOnboardingComplete: a.stripeConnectOnboardingComplete === true,
      stripeConnectPayoutsEnabled: a.stripeConnectPayoutsEnabled === true,
      createdAt: a.createdAt?.toDate?.()?.toISOString?.() ?? null,
      updatedAt: a.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    }));

    return NextResponse.json({ affiliates: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const affiliate = await createAffiliatePartner({
      name: body.name,
      email: body.email,
      phone: body.phone,
      commissionSeller: body.commissionSeller,
      commissionDealerBasic: body.commissionDealerBasic,
      commissionDealerOther: body.commissionDealerOther ?? body.commissionDealer,
      commissionDealer: body.commissionDealer,
      referralCode: body.referralCode,
      password: body.password,
    });

    void notifyPlatformAdminsOfRegistration({
      kind: 'affiliate',
      name: affiliate.name,
      email: affiliate.email,
      title: 'Afiliado creado desde admin',
      message: `Se creó la cuenta de afiliado ${affiliate.name} (${affiliate.email}).`,
      adminRoute: '/admin/referrals/affiliates',
      audience: 'platform',
      metadata: {
        affiliateId: affiliate.id,
        referralCode: affiliate.referralCode,
      },
      details: [{ label: 'Código de referido', value: affiliate.referralCode }],
    }).catch((err) =>
      console.warn('[admin/affiliates] admin registration notify failed:', err)
    );

    void sendAffiliateRegistrationWelcomeEmail({
      name: affiliate.name,
      email: affiliate.email,
      referralCode: affiliate.referralCode,
      selfRegistered: false,
      temporaryPassword: affiliate.temporaryPassword,
    }).catch((err) =>
      console.warn('[admin/affiliates] welcome email failed:', err instanceof Error ? err.message : err)
    );

    return NextResponse.json({
      success: true,
      affiliate: {
        ...affiliate,
        referralLink: buildAffiliateReferralLink(affiliate.referralCode),
      },
      temporaryPassword: affiliate.temporaryPassword,
      portalUrl: buildPublicWebUrl('/affiliate/login'),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
