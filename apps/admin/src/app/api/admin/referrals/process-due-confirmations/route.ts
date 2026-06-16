export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { processDueReferralConfirmations } from '@autodealers/core';

/** Ejecuta manualmente el cron de referidos (14 días). Solo administradores. */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await processDueReferralConfirmations();
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('process-due-confirmations:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
