import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById, getFirestore, getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { methodType } = await request.json();
    const paymentMethodType = methodType === 'us_bank_account' ? 'us_bank_account' : 'card';

    const advertiser = await getAdvertiserById(id);
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: [paymentMethodType],
      customer: customerId,
      success_url: `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}/admin/advertisers/${advertiser.id}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}/admin/advertisers/${advertiser.id}/billing?canceled=true`,
      metadata: {
        advertiserId: advertiser.id,
        action: 'add_payment_method',
        methodType: paymentMethodType,
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('Admin setup-session error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}


