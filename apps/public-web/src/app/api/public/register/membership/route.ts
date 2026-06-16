import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Legacy endpoint — la membresía se activa vía Stripe Checkout con trial + tarjeta.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'payment_required',
      message:
        'Debes registrar tu método de pago en el checkout. Incluye 7 días de prueba gratis; el cobro mensual inicia automáticamente al terminar.',
      requiresCheckout: true,
    },
    { status: 402 }
  );
}
