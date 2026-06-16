import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createReviewInvite } from '@autodealers/crm';
import { getUserById } from '@autodealers/core';
import { buildReviewInvitePublicUrl } from '@/lib/public-web-url';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const user = await getUserById(auth.userId);
    const providerName =
      (typeof body.providerName === 'string' && body.providerName.trim()) ||
      user?.name ||
      'Tu vendedor';

    const { token } = await createReviewInvite({
      tenantId: auth.tenantId,
      createdBy: auth.userId,
      providerName,
      sellerId: auth.role === 'seller' ? auth.userId : body.sellerId,
      dealerId: auth.role === 'dealer' ? auth.userId : auth.dealerId || undefined,
      customerNameHint: body.customerNameHint,
      vehicleId: body.vehicleId,
      saleId: body.saleId,
    });

    const url = buildReviewInvitePublicUrl(request, token);

    return NextResponse.json({ success: true, url, token });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('review-invites POST:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
