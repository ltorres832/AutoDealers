export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processWeeklyAffiliatePayouts } from '@autodealers/core';
import { authorizeCronRequest } from '@/lib/cron-auth';

/**
 * Cron: transfiere comisiones aprobadas a cuentas Stripe Connect Express.
 * Programar los lunes 10:00 America/Puerto_Rico vía affiliatePayoutsWeekly.
 *
 * POST /api/admin/cron/affiliate-payouts
 * Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;

  try {
    const result = await processWeeklyAffiliatePayouts();
    console.log('✅ affiliate-payouts cron:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ affiliate-payouts cron failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    message: 'Endpoint activo. Usa POST para procesar pagos semanales a afiliados.',
    scheduleHint: '0 10 * * 1 (America/Puerto_Rico)',
  });
}
