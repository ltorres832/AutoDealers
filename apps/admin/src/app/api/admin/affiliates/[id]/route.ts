export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAffiliatePartner,
  updateAffiliatePartner,
  buildAffiliateReferralLink,
} from '@autodealers/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const affiliate = await getAffiliatePartner(id);
    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      affiliate: {
        ...affiliate,
        referralLink: buildAffiliateReferralLink(affiliate.referralCode),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await updateAffiliatePartner(id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      commissionSeller: body.commissionSeller,
      commissionDealerBasic: body.commissionDealerBasic,
      commissionDealerOther: body.commissionDealerOther ?? body.commissionDealer,
      commissionDealer: body.commissionDealer,
      paymentMethod: body.paymentMethod,
      paymentNotes: body.paymentNotes,
      status: body.status,
      referralCode: body.referralCode,
    });

    const affiliate = await getAffiliatePartner(id);
    return NextResponse.json({
      success: true,
      affiliate: affiliate
        ? { ...affiliate, referralLink: buildAffiliateReferralLink(affiliate.referralCode) }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
