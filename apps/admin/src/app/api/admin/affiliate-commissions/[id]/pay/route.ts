export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/** Pagos manuales deprecados: comisiones se pagan vía Stripe Connect (cron lunes o reintento). */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Pago manual deshabilitado. Usa Stripe Connect: /admin/stripe o reintenta el payout en Afiliados.',
    },
    { status: 410 }
  );
}
