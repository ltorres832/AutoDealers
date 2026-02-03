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
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId es requerido' },
        { status: 400 }
      );
    }

    // Verificar el Payment Intent en Stripe
    const stripe = await getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'El pago no fue completado exitosamente' },
        { status: 400 }
      );
    }

    // Obtener el anuncio
    const adSnap = await db.collection('sponsored_content').doc(adId).get();
    if (!adSnap.exists) {
      return NextResponse.json(
        { error: 'Anuncio no encontrado' },
        { status: 404 }
      );
    }

    const adData = adSnap.data() || {};
    if (adData.advertiserId !== advertiserId) {
      return NextResponse.json(
        { error: 'Anunciante no coincide con el anuncio' },
        { status: 400 }
      );
    }

    // Actualizar el anuncio con el estado de pago completado
    await adSnap.ref.update({
      paymentStatus: 'paid',
      paymentIntentId,
      status: adData.status === 'approved' ? 'active' : adData.status,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Pago confirmado exitosamente',
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Error al confirmar el pago', details: error.message },
      { status: 500 }
    );
  }
}

