export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAffiliateCommissionConfig,
  updateAffiliateCommissionConfig,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const config = await getAffiliateCommissionConfig();
    return NextResponse.json({ config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const config = {
      seller: Number(body.seller) || 0,
      dealerBasic: Number(body.dealerBasic) || 0,
      dealerOther: Number(body.dealerOther ?? body.dealer) || 0,
      currency: String(body.currency || 'USD'),
    };

    await updateAffiliateCommissionConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
