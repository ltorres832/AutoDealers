export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { disconnectSellerFromDealer } from '@autodealers/core/dealer-seller-links';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const link = await disconnectSellerFromDealer(auth.userId);
    return NextResponse.json({ success: true, link, refreshSession: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al desvincular';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
