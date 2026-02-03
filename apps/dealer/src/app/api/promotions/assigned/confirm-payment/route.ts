import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeInstance } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId, requestId } = body;

    if (!paymentIntentId || !requestId) {
      return NextResponse.json(
        { error: 'paymentIntentId y requestId son requeridos' },
        { status: 400 }
      );
    }

    const stripe = await getStripeInstance();

    // Verificar el Payment Intent en Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'El pago no fue completado exitosamente' },
        { status: 400 }
      );
    }

    // Obtener la solicitud de promoción asignada
    const requestRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests')
      .doc(requestId);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Solicitud de promoción no encontrada' },
        { status: 404 }
      );
    }

    const requestData = requestDoc.data();
    if (requestData?.assignedTo !== auth.userId) {
      return NextResponse.json(
        { error: 'No autorizado para esta solicitud' },
        { status: 403 }
      );
    }

    // Actualizar la solicitud con el estado de pago completado
    await requestRef.update({
      status: 'paid',
      paymentStatus: 'completed',
      paymentIntentId,
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

