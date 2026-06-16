export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { joinDealerWithInviteCode } from '@autodealers/core/dealer-seller-invite-codes';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code : '';

    const link = await joinDealerWithInviteCode(code, auth.userId);
    return NextResponse.json({ success: true, link, refreshSession: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

