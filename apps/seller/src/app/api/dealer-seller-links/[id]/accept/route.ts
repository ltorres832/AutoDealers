export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { acceptDealerSellerLink } from '@autodealers/core/dealer-seller-links';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const link = await acceptDealerSellerLink(id, auth.userId);
    return NextResponse.json({ success: true, link, refreshSession: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al aceptar';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
