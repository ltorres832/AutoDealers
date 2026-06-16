import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { advertiserBillingReturnUrl } from '@/lib/app-origin';
import { getAdvertiserById, getFirestore, getStripeInstance } from '@autodealers/core';
import { getFirestoreFieldValue } from '@autodealers/shared';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { methodType } = await request.json();
    const paymentMethodType = methodType === 'us_bank_account' ? 'us_bank_account' : 'card';

    const advertiser = await getAdvertiserById(auth.userId);
    if (!advertiser) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }

    const stripe = await getStripeInstance();

    // Asegurar customer
    let customerId = advertiser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: advertiser.email,
        name: advertiser.companyName,
        metadata: { advertiserId: advertiser.id },
      });
      customerId = customer.id;
      await db.collection('advertisers').doc(advertiser.id).update({
        stripeCustomerId: customerId,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: [paymentMethodType],
      customer: customerId,
      success_url: advertiserBillingReturnUrl(request, 'success=true'),
      cancel_url: advertiserBillingReturnUrl(request, 'canceled=true'),
      metadata: {
        advertiserId: advertiser.id,
        action: 'add_payment_method',
        methodType: paymentMethodType,
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('Error creating setup session:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}


