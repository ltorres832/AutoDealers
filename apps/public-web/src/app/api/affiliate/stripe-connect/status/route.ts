export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAffiliateAuth } from '@/lib/affiliate-auth';
import { getAffiliateConnectStatus } from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await verifyAffiliateAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const status = await getAffiliateConnectStatus(auth.affiliateId);
    return NextResponse.json({ status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
