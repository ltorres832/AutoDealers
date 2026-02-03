import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeService } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bannerId } = body;

    if (!bannerId) {
      return NextResponse.json(
        { error: 'Missing bannerId' },
        { status: 400 }
      );
    }

    // Obtener el banner asignado
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
    
    // Verificar que el banner está asignado y pendiente de pago
    if (bannerData?.status !== 'assigned' || bannerData?.paymentStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Este banner no está disponible para pago' },
        { status: 400 }
      );
    }

    // Verificar que el banner fue asignado al usuario actual
    if (bannerData?.assignedTo !== auth.userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para pagar este banner' },
        { status: 403 }
      );
    }

    // Verificar límite global de banners activos (4 máximo)
    const activeBannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get();

    if (activeBannersSnapshot.size >= 4) {
      return NextResponse.json(
        { 
          error: 'Límite alcanzado',
          message: 'Ya hay 4 banners activos. Por favor espera a que expire alguno.'
        },
        { status: 400 }
      );
    }

    // Obtener servicio de Stripe
    const stripeService = await getStripeService();

    // Obtener información del usuario/tenant
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener o crear cliente de Stripe
    let customerId: string | undefined;
    if (userData?.stripeCustomerId) {
      customerId = userData.stripeCustomerId;
    } else {
      const customer = await stripeService.createCustomer(
        userData?.email || `tenant-${auth.tenantId}@autodealers.com`,
        userData?.name || auth.tenantId,
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
        }
      );
      customerId = customer.id;

      await db.collection('users').doc(auth.userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Crear Payment Intent para pago integrado
    const paymentIntent = await stripeService.createPaymentIntent(
      bannerData.price,
      'usd',
      `Banner Asignado: ${bannerData.title}`,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'premium_banner',
        bannerId: bannerId,
        isAssigned: 'true',
        title: bannerData.title,
        description: bannerData.description,
        ctaText: bannerData.ctaText,
        linkType: bannerData.linkType,
        linkValue: bannerData.linkValue,
        imageUrl: bannerData.imageUrl,
        duration: bannerData.duration,
      },
      customerId
    );

    // Actualizar banner con el ID del Payment Intent
    await bannerRef.update({
      paymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      bannerId: bannerId,
    });
  } catch (error: any) {
    console.error('Error paying assigned banner:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


