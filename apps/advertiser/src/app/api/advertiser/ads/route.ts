import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
const {
  createSponsoredContent,
  getAdvertiserContent,
  getAdvertiserById,
  getFirestore,
} = require('@autodealers/core') as any;
import * as admin from 'firebase-admin';
import { getStripeService } from '@autodealers/core';

const db = getFirestore();

// GET - Obtener todos los anuncios del anunciante
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const ads = await getAdvertiserContent(auth.userId);

    return NextResponse.json({
      ads: ads.map((ad: any) => ({
        ...ad,
        ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching ads:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo anuncio
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type,
      placement,
      campaignName,
      title,
      description,
      imageUrl,
      videoUrl,
      linkUrl,
      linkType,
      targetLocation,
      targetVehicleTypes,
      price,
      durationDays,
      startDate,
      mediaType,
    } = body;

    // Validaciones
    if (!type || !placement || !title || !linkUrl || !durationDays) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const priceNumber = typeof price === 'number' ? price : Number(price ?? 0);
    if (!priceNumber || isNaN(priceNumber)) {
      return NextResponse.json(
        { error: 'No se pudo determinar el precio del anuncio' },
        { status: 400 }
      );
    }

    const duration = Number(durationDays);
    if (![7, 15, 30].includes(duration)) {
      return NextResponse.json(
        { error: 'Duración no válida. Usa 7, 15 o 30 días.' },
        { status: 400 }
      );
    }

    const media = mediaType === 'video' ? 'video' : 'image';
    if (media === 'image' && !imageUrl) {
      return NextResponse.json(
        { error: 'Debes subir o pegar una imagen.' },
        { status: 400 }
      );
    }
    if (media === 'video' && !videoUrl) {
      return NextResponse.json(
        { error: 'Debes subir o pegar un video.' },
        { status: 400 }
      );
    }

    // Obtener información del anunciante
    const advertiser = await getAdvertiserById(auth.userId);
    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que tenga un plan activo
    if (!advertiser.plan) {
      return NextResponse.json(
        { error: 'Debes seleccionar un plan para crear anuncios. Por favor, selecciona un plan primero.' },
        { status: 400 }
      );
    }

    // Obtener configuración de precios desde admin_config
    const pricingConfigDoc = await db.collection('admin_config').doc('pricing').get();
    let actualPrice = priceNumber;
    
    if (pricingConfigDoc.exists) {
      const pricingConfig = pricingConfigDoc.data();
      
      // Calcular precio real según tipo y placement
      if (type === 'banner' && pricingConfig.banners) {
        const bannerConfig = pricingConfig.banners[placement];
        if (bannerConfig && bannerConfig.prices && bannerConfig.prices[duration]) {
          actualPrice = bannerConfig.prices[duration];
        }
      } else if ((type === 'promotion' || type === 'sponsor') && pricingConfig.promotions) {
        // Para promociones, usar vehicle como default (puede ajustarse según necesidad)
        const promotionConfig = pricingConfig.promotions.vehicle;
        if (promotionConfig && promotionConfig.prices && promotionConfig.prices[duration]) {
          actualPrice = promotionConfig.prices[duration];
        }
      }
      
      // Aplicar impuestos si están configurados
      if (pricingConfig.taxRate && pricingConfig.taxRate > 0) {
        actualPrice = actualPrice * (1 + pricingConfig.taxRate / 100);
      }
    }

    // Validar que el precio enviado coincida con el precio calculado (con tolerancia de 1%)
    const priceDifference = Math.abs(priceNumber - actualPrice) / actualPrice;
    if (priceDifference > 0.01) {
      console.warn(`Price mismatch: sent ${priceNumber}, calculated ${actualPrice}. Using calculated price.`);
    }

    // Calcular fecha de fin basada en duración
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + duration);

    // Crear el anuncio en estado de pago pendiente
    const ad = await createSponsoredContent({
      advertiserId: auth.userId,
      advertiserName: advertiser.companyName,
      campaignName: campaignName || undefined,
      type: type as 'banner' | 'promotion' | 'sponsor',
      placement: placement as 'hero' | 'sidebar' | 'sponsors_section' | 'between_content',
      title,
      description: description || '',
      imageUrl: media === 'image' ? imageUrl : '',
      videoUrl: media === 'video' ? videoUrl : '',
      linkUrl,
      linkType: linkType as 'external' | 'landing_page',
      targetLocation,
      targetVehicleTypes,
      budget: actualPrice,
      budgetType: 'total',
      startDate: start,
      endDate: end,
      // Campos adicionales
      price: actualPrice,
      durationDays: duration,
      status: 'payment_pending' as any,
    });

    // Obtener servicio de Stripe desde Firestore
    let stripeService;
    try {
      stripeService = await getStripeService();
    } catch (stripeError: any) {
      return NextResponse.json(
        {
          success: true,
          ad,
          payment: {
            required: true,
            error: `Stripe no está configurado: ${stripeError.message}. Configura las credenciales en Admin → Configuración → General → Stripe.`,
          },
        },
        { status: 200 }
      );
    }

    // Crear Payment Intent para cobrar el anuncio (pago integrado)
    const paymentIntent = await stripeService.createPaymentIntent(
      actualPrice,
      'usd',
      `Anuncio: ${title || campaignName}`,
      {
        action: 'ad_payment',
        advertiserId: auth.userId,
        adId: ad.id,
        campaignName: campaignName || 'Campaña publicitaria',
      },
      advertiser.stripeCustomerId
    );

    // Guardar referencia al payment intent en el anuncio
    await db.collection('sponsored_content').doc(ad.id).update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      ad,
      payment: {
        required: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error: any) {
    console.error('Error creating ad:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear anuncio' },
      { status: 500 }
    );
  }
}

