import { NextResponse } from 'next/server';
import { getStripePublishableKey } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/** Clave pública de Stripe (Admin → Configuración → Stripe o env). */
export async function GET() {
  try {
    const publishableKey = await getStripePublishableKey();

    if (!publishableKey) {
      return NextResponse.json(
        {
          error:
            'Stripe no configurado. Añade la clave publicable en Admin → Configuración → General → Stripe.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ publishableKey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('advertiser stripe publishable-key:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
