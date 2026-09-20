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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: adId } = await params;
    const body = await request.json().catch(() => ({}));
    const setupIntentId = String(body.setupIntentId || '').trim();

    if (!setupIntentId) {
      return NextResponse.json({ error: 'setupIntentId es requerido' }, { status: 400 });
    }

    const adRef = db.collection('sponsored_content').doc(adId);
    const adDoc = await adRef.get();
    if (!adDoc.exists) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }

    const adData = adDoc.data() || {};
    if (adData.advertiserId !== auth.userId) {
      return NextResponse.json({ error: 'No autorizado para este anuncio' }, { status: 403 });
    }

    const stripe = await getStripeInstance();
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Stripe no aprobó el método de pago para uso futuro.' },
        { status: 400 }
      );
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'No se recibió el método de pago aprobado por Stripe.' },
        { status: 400 }
      );
    }

    await adRef.set(
      {
        status: 'queued',
        queueStatus: 'waiting_for_slot',
        paymentStatus: 'method_saved',
        setupIntentId,
        queuedPaymentMethodId: paymentMethodId,
        stripeCustomerId:
          typeof setupIntent.customer === 'string'
            ? setupIntent.customer
            : setupIntent.customer?.id || adData.stripeCustomerId,
        queuedConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Anuncio colocado en turno. Se cobrará automáticamente cuando haya espacio disponible.',
    });
  } catch (error: any) {
    console.error('confirm queued ad setup:', error);
    return NextResponse.json(
      { error: error.message || 'No se pudo confirmar el turno del anuncio.' },
      { status: 500 }
    );
  }
}
