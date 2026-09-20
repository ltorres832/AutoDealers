import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listPayouts } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payouts = await listPayouts(auth.tenantId, { sellerId: auth.userId, limit: 100 });
    return NextResponse.json({ payouts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[compensation/payouts]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
