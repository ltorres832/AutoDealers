import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id: adId } = await params;
    const body = await request.json();
    const { paymentIntentId } = body;

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

    // Actualizar el anuncio con el estado de pago completado
    const adRef = db.collection('sponsored_content').doc(adId);
    const adDoc = await adRef.get();

    if (!adDoc.exists) {
      return NextResponse.json(
        { error: 'Anuncio no encontrado' },
        { status: 404 }
      );
    }

    const adData = adDoc.data();
    if (adData?.advertiserId !== auth.userId) {
      return NextResponse.json(
        { error: 'No autorizado para este anuncio' },
        { status: 403 }
      );
    }

    // Actualizar el anuncio
    await adRef.update({
      paymentStatus: 'paid',
      paymentIntentId,
      status: 'active',
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

