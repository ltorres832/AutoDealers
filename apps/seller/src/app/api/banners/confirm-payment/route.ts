import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dealerManagedPaymentsResponse } from '@/lib/dealer-managed-guard';
import { getFirestore, getStripeInstance } from '@autodealers/core';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerBlock = dealerManagedPaymentsResponse(auth);
    if (dealerBlock) return dealerBlock;

    const body = await request.json();
    const { paymentIntentId, bannerId } = body;

    if (!paymentIntentId || !bannerId) {
      return NextResponse.json(
        { error: 'paymentIntentId y bannerId son requeridos' },
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

    // Obtener el banner
    const bannerRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_banners')
      .doc(bannerId);

    const bannerDoc = await bannerRef.get();
    if (!bannerDoc.exists) {
      return NextResponse.json(
        { error: 'Banner no encontrado' },
        { status: 404 }
      );
    }

    const bannerData = bannerDoc.data();
    if (bannerData?.requestedBy !== auth.userId) {
      return NextResponse.json(
        { error: 'No autorizado para este banner' },
        { status: 403 }
      );
    }

    const { markPremiumBannerPaid } = await import('@autodealers/core');
    await markPremiumBannerPaid({
      tenantId: auth.tenantId,
      bannerId,
      paymentIntentId,
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

