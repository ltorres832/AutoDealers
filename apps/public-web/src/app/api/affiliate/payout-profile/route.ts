export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json(
    {
      error:
        'El método de cobro manual ya no está disponible. Usa Stripe Connect en la pestaña Cobros Stripe del portal.',
      deprecated: true,
    },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      error:
        'El método de cobro manual ya no está disponible. Conecta tu cuenta Stripe desde el portal de afiliados.',
      deprecated: true,
    },
    { status: 410 }
  );
}
