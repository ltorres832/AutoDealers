import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStripeService } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, ctaText, linkType, linkValue, imageUrl, videoUrl, mediaType, duration, paymentMethodId } = body;

    if (!title || !description || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, duration' },
        { status: 400 }
      );
    }

    if (mediaType === 'video' && !videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required when mediaType is video' },
        { status: 400 }
      );
    }

    if (mediaType !== 'video' && !imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required when mediaType is image' },
        { status: 400 }
      );
    }

    // Obtener precio desde configuración
    const { getBannerPrice, getBannerDurations } = await import('@autodealers/core');
    const placement = (body.placement || 'hero') as 'hero' | 'sidebar' | 'between_content' | 'sponsors_section';
    const availableDurations = await getBannerDurations(placement);
    const price = await getBannerPrice(placement, duration);

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: `Invalid duration. Available durations: ${availableDurations.join(', ')} days` },
        { status: 400 }
      );
    }

    // Verificar límite global de banners activos (4 máximo)
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const activeBannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get();

    if (activeBannersSnapshot.size >= 4) {
      return NextResponse.json(
        { 
          error: 'Límite alcanzado',
          message: 'Ya hay 4 banners activos. Por favor espera a que expire alguno.',
          limitReached: true,
          availableSlots: 0
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

    // Guardar solicitud de banner premium (pendiente de aprobación)
    const bannerRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_banners')
      .doc();

    // Crear Payment Intent para pago integrado
    const paymentIntent = await stripeService.createPaymentIntent(
      price,
      'usd',
      `Banner Premium: ${title}`,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'premium_banner',
        title,
        description,
        ctaText,
        linkType,
        linkValue,
        imageUrl,
        videoUrl,
        mediaType: mediaType || 'image',
        duration,
      },
      customerId,
      paymentMethodId // Método de pago guardado (opcional)
    );

    // Guardar el banner con el paymentIntentId
    await bannerRef.set({
      title,
      description,
      ctaText,
      linkType,
      linkValue,
      imageUrl: mediaType === 'video' ? undefined : imageUrl,
      videoUrl: mediaType === 'video' ? videoUrl : undefined,
      mediaType: mediaType || 'image',
      duration,
      price,
      status: 'pending',
      approved: false,
      paymentIntentId: paymentIntent.id,
      requestedBy: auth.userId,
      views: 0,
      clicks: 0,
      priority: activeBannersSnapshot.size + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Si se usó un método guardado y el pago se completó automáticamente
    if (paymentMethodId && paymentIntent.status === 'succeeded') {
      // Actualizar el banner directamente
      await bannerRef.update({
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        bannerId: bannerRef.id,
        paymentCompleted: true,
      });
    }

    // Si requiere autenticación adicional (3D Secure) o es una nueva tarjeta
    // Verificar si el PaymentIntent requiere acción adicional
    if (paymentIntent.status === 'requires_action' && paymentIntent.next_action) {
      // Si requiere autenticación adicional, devolver el clientSecret para completar
      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        bannerId: bannerRef.id,
        requiresAction: true,
      });
    }

    // Si es una nueva tarjeta sin método guardado
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      bannerId: bannerRef.id,
    });
  } catch (error: any) {
    console.error('Error purchasing premium banner:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

