export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processDueReferralConfirmations } from '@autodealers/core';
import { authorizeCronRequest } from '@/lib/cron-auth';

/**
 * Cron: otorga recompensas de referidos tras el período de espera (14 días).
 * Programar diario (p. ej. 03:00 America/Puerto_Rico) vía Cloud Scheduler o Firebase onSchedule.
 *
 * POST /api/admin/cron/confirm-referrals
 * Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;

  try {
    const result = await processDueReferralConfirmations();
    console.log('✅ confirm-referrals cron:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ confirm-referrals cron failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    message: 'Endpoint activo. Usa POST para procesar referidos vencidos.',
    scheduleHint: '0 3 * * * (America/Puerto_Rico)',
  });
}
