export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  createOrRotateDealerSellerInviteCode,
  deactivateDealerSellerInviteCode,
  getDealerSellerInviteCode,
  buildSellerJoinDealerUrl,
} from '@autodealers/core/dealer-seller-invite-codes';

const SELLER_APP_ORIGIN =
  process.env.NEXT_PUBLIC_SELLER_URL?.trim() ||
  'https://seller-app--autodealers-7f62e.us-central1.hosted.app';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await getDealerSellerInviteCode(auth.tenantId);
    return NextResponse.json({
      inviteCode: row
        ? {
            ...row,
            joinUrl: buildSellerJoinDealerUrl(SELLER_APP_ORIGIN, row.code),
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : undefined;

    const row = await createOrRotateDealerSellerInviteCode({
      dealerTenantId: auth.tenantId,
      dealerUserId: auth.userId,
      message,
    });

    return NextResponse.json({
      inviteCode: { ...row, joinUrl: buildSellerJoinDealerUrl(SELLER_APP_ORIGIN, row.code) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await deactivateDealerSellerInviteCode(auth.tenantId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

