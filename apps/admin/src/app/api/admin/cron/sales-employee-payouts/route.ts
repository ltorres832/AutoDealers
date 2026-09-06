export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processEligibleSalesEmployeePayouts } from '@autodealers/core';
import { authorizeCronRequest } from '@/lib/cron-auth';

export async function POST(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;

  try {
    const result = await processEligibleSalesEmployeePayouts();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;
  return NextResponse.json({
    ok: true,
    message: 'Usa POST para procesar comisiones elegibles de empleados de ventas.',
    scheduleHint: '0 11 * * * (America/Puerto_Rico)',
  });
}
