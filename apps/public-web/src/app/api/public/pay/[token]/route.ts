import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentLinkByToken,
  getAutomotiveBusinessById,
  getPaymentCapability,
  createInvoicePaymentCheckout,
} from '@autodealers/core';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const link = await getPaymentLinkByToken(token);
    if (!link) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    const [business, capability] = await Promise.all([
      getAutomotiveBusinessById(link.tenantId),
      getPaymentCapability(link.tenantId),
    ]);
    return NextResponse.json({
      link,
      business,
      methods: {
        card: capability.card,
        klarna: capability.klarna,
        affirm: capability.affirm,
      },
      capability,
    });
  } catch (error: any) {
    console.error('Error loading payment link:', error);
    return NextResponse.json({ error: 'No se pudo cargar el pago' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const origin = resolvePublicWebUrl();
    const body = await request.json().catch(() => ({}));
    const checkout = await createInvoicePaymentCheckout({
      token,
      customerEmail: body.customerEmail,
      method: body.method,
      successUrl: `${origin}/pay/${encodeURIComponent(token)}?paid=1`,
      cancelUrl: `${origin}/pay/${encodeURIComponent(token)}?cancelled=1`,
    });
    return NextResponse.json(checkout);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo iniciar el pago' }, { status: 400 });
  }
}
