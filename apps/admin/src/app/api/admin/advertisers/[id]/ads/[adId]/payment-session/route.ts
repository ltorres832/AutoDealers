import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: advertiserId, adId } = await params;

    // Obtener anuncio
    const adSnap = await db.collection('sponsored_content').doc(adId).get();
    if (!adSnap.exists) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }
    const adData = adSnap.data() || {};
    if (adData.advertiserId !== advertiserId) {
      return NextResponse.json({ error: 'Anunciante no coincide con el anuncio' }, { status: 400 });
    }

    // Obtener anunciante
    const advSnap = await db.collection('advertisers').doc(advertiserId).get();
    if (!advSnap.exists) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }
    const advertiser = advSnap.data() || {};

    const priceNumber =
      typeof adData.price === 'number'
        ? adData.price
        : typeof adData.budget === 'number'
          ? adData.budget
          : Number(adData.price || 0);

    if (!priceNumber || isNaN(priceNumber)) {
      return NextResponse.json({ error: 'Precio del anuncio no definido' }, { status: 400 });
    }

    const stripe = await getStripeInstance();

    const successUrl = `${request.nextUrl.origin}/admin/sponsored-content?payment=success&ad=${adId}`;
    const cancelUrl = `${request.nextUrl.origin}/admin/sponsored-content?payment=cancel&ad=${adId}`;

    // Crear Payment Intent para pago integrado
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(priceNumber * 100),
      currency: 'usd',
      customer: advertiser.stripeCustomerId || undefined,
      description: `Anuncio: ${adData.title || adData.campaignName || 'Anuncio'}`,
      metadata: {
        action: 'ad_payment',
        advertiserId,
        adId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await adSnap.ref.update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      status: adData.status === 'approved' ? adData.status : 'payment_pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Admin ad payment session error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}

