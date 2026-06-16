import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createReviewInvite } from '@autodealers/crm';
import { getUserById, getFirestore } from '@autodealers/core';
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

    let providerName =
      (typeof body.providerName === 'string' && body.providerName.trim()) || user?.name || '';

    if (!providerName) {
      const tenantSnap = await getFirestore().collection('tenants').doc(auth.tenantId).get();
      providerName = String(tenantSnap.data()?.name || 'Tu concesionario');
    }

    const { token } = await createReviewInvite({
      tenantId: auth.tenantId,
      createdBy: auth.userId,
      providerName,
      sellerId: body.sellerId,
      dealerId: auth.role === 'dealer' ? auth.userId : undefined,
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
