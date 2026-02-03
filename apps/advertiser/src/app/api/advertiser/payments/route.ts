import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById, getStripeInstance } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const advertiser = await getAdvertiserById(auth.userId);
    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    // Si no tiene Stripe customer ID, retornar array vacío
    if (!advertiser.stripeCustomerId) {
      return NextResponse.json({ payments: [] });
    }

    const stripe = await getStripeInstance();

    // Obtener pagos de Stripe
    const payments = await stripe.paymentIntents.list({
      customer: advertiser.stripeCustomerId,
      limit: 100,
    });

    // Obtener también invoices (facturas)
    const invoices = await stripe.invoices.list({
      customer: advertiser.stripeCustomerId,
      limit: 100,
    });

    // Combinar y formatear pagos
    const paymentHistory = [
      ...payments.data.map(payment => ({
        id: payment.id,
        type: 'payment_intent',
        amount: payment.amount / 100, // Convertir de centavos a dólares
        currency: payment.currency.toUpperCase(),
        status: payment.status,
        description: payment.description || 'Pago de anuncio',
        created: new Date(payment.created * 1000).toISOString(),
        metadata: payment.metadata,
      })),
      ...invoices.data.map(invoice => ({
        id: invoice.id,
        type: 'invoice',
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status === 'paid' ? 'succeeded' : invoice.status,
        description: invoice.description || `Factura ${invoice.number || ''}`,
        created: new Date(invoice.created * 1000).toISOString(),
        metadata: invoice.metadata,
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      })),
    ].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return NextResponse.json({ payments: paymentHistory });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    
    // Si Stripe no está configurado, retornar array vacío
    if (error.message?.includes('secret') || error.message?.includes('key')) {
      return NextResponse.json({ payments: [] });
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
