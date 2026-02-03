import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById, getStripeInstance } from '@autodealers/core';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const advertiser = await getAdvertiserById(id);
    if (!advertiser || !advertiser.stripeCustomerId) {
      return NextResponse.json({ paymentMethods: [] });
    }

    const stripe = await getStripeInstance();

    const cards = await stripe.paymentMethods.list({
      customer: advertiser.stripeCustomerId,
      type: 'card',
    });
    const banks = await stripe.paymentMethods.list({
      customer: advertiser.stripeCustomerId,
      type: 'us_bank_account',
    });

    return NextResponse.json({
      paymentMethods: [
        ...cards.data.map((pm) => ({
          id: pm.id,
          type: 'card',
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
          isDefault: (advertiser as any).defaultPaymentMethod === pm.id,
        })),
        ...banks.data.map((pm) => ({
          id: pm.id,
          type: 'us_bank_account',
          bank_name: pm.us_bank_account?.bank_name,
          last4: pm.us_bank_account?.last4,
          routing_number: pm.us_bank_account?.routing_number,
          isDefault: (advertiser as any).defaultPaymentMethod === pm.id,
          status: (pm.us_bank_account as any)?.status,
        })),
      ],
      defaultPaymentMethod: (advertiser as any).defaultPaymentMethod || null,
    });
  } catch (error: any) {
    console.error('Admin list payment methods error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener métodos de pago' },
      { status: 500 }
    );
  }
}


