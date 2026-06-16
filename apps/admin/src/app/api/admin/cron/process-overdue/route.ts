export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { processOverdueSubscriptions } from '@autodealers/billing';

/**
 * Procesa suscripciones vencidas y suspende cuentas tras el período de gracia.
 * Ejecutar diariamente (Cloud Scheduler / Firebase Functions).
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await authorizeCronRequest(request);
    if (denied) return denied;

    const result = await processOverdueSubscriptions();

    return NextResponse.json({
      success: true,
      message: 'Overdue subscriptions processed',
      result,
    });
  } catch (error) {
    console.error('Error processing overdue subscriptions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeCronRequest(request);
    if (denied) return denied;

    return NextResponse.json({
      message: 'POST para procesar suscripciones vencidas y suspender cuentas por falta de pago.',
      graceDays: process.env.SUBSCRIPTION_GRACE_DAYS || '3 (default)',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
