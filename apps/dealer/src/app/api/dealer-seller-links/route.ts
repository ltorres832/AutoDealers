export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { inviteExistingSellerToDealer } from '@autodealers/core/dealer-seller-links';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : undefined;

    if (!email) {
      return NextResponse.json({ error: 'Email del vendedor requerido' }, { status: 400 });
    }

    const link = await inviteExistingSellerToDealer({
      dealerTenantId: auth.tenantId,
      dealerUserId: auth.userId,
      sellerEmail: email,
      message,
    });

    return NextResponse.json({ success: true, link });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al enviar invitación';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
