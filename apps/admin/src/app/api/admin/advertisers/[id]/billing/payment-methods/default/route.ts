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
    const { paymentMethodId } = await request.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'paymentMethodId requerido' }, { status: 400 });
    }

    const advertiser = await getAdvertiserById(id);
    if (!advertiser || !advertiser.stripeCustomerId) {
      return NextResponse.json({ error: 'Anunciante o customer no encontrado' }, { status: 404 });
    }

    const stripe = await getStripeInstance();

    await stripe.customers.update(advertiser.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    await db.collection('advertisers').doc(advertiser.id).update({
      defaultPaymentMethod: paymentMethodId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin set default payment method error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar método predeterminado' },
      { status: 500 }
    );
  }
}


