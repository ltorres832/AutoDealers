export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { previewDealerSellerInviteCode } from '@autodealers/core/dealer-seller-invite-codes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code : '';
    const result = await previewDealerSellerInviteCode(code);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}

