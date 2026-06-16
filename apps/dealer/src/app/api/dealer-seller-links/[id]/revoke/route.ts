export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { revokeDealerSellerLink } from '@autodealers/core/dealer-seller-links';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const link = await revokeDealerSellerLink(id, auth.tenantId);
    return NextResponse.json({ success: true, link });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al revocar';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
