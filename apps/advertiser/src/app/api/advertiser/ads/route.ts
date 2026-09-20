import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import * as admin from 'firebase-admin';
import {
  createSponsoredContent,
  getAdvertiserContent,
  getAdvertiserById,
  getFirestore,
  getStripeInstance,
  getStripeService,
} from '@autodealers/core';
import {
  parseAdLinkType,
  requiresDestinationUrl,
  resolveAdLinkForSave,
} from '@/lib/ad-link-types';
import {
  AD_PLACEMENT_CAPACITY,
  AD_PLACEMENT_LABELS,
  isAdPlacement,
  type AdPlacement,
} from '@/lib/ad-placements';
import { resolveAdCreativePayload } from '@autodealers/core/ad-creative';

const db = getFirestore();

function dateLikeToMillis(value: any): number | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

async function countReservedPlacementSlots(placement: AdPlacement): Promise<number> {
  const now = Date.now();
  const pendingReservationWindowMs = 45 * 60 * 1000;
  const snap = await db.collection('sponsored_content').where('placement', '==', placement).get();

  return snap.docs.filter((doc: any) => {
    const data = doc.data() || {};
    const status = String(data.status || '');
    const endMillis = dateLikeToMillis(data.endDate);
    const updatedMillis = dateLikeToMillis(data.updatedAt) ?? dateLikeToMillis(data.createdAt);

    if (endMillis !== null && endMillis < now) return false;
    if (status === 'active' || status === 'approved') return true;
    if (status === 'payment_pending') {
      return updatedMillis === null || now - updatedMillis <= pendingReservationWindowMs;
    }
    return false;
  }).length;
}

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
      images,
      animation,
      videoUrl,
      linkUrl,
      linkType,
      targetLocation,
      targetVehicleTypes,
      price,
      durationDays,
      startDate,
      mediaType,
      allowQueue,
    } = body;

    // Validaciones
    if (!type || !placement || !durationDays) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!isAdPlacement(placement)) {
      return NextResponse.json(
        { error: 'Ubicación de anuncio no válida.' },
        { status: 400 }
      );
    }

    const parsedLinkType = parseAdLinkType(linkType);
    if (requiresDestinationUrl(parsedLinkType) && !String(linkUrl || '').trim()) {
      return NextResponse.json(
        { error: 'La URL de destino es obligatoria para enlace externo' },
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
    const creative = resolveAdCreativePayload({ imageUrl, images, animation });
    if (media === 'image' && !creative.imageUrl) {
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

    const advertiser = await getAdvertiserById(auth.userId);
    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    const { getBannerPrice, getPromotionPrice, getPricingConfig } = await import('@autodealers/core');
    const pricingConfig = await getPricingConfig();
    let actualPrice =
      type === 'banner'
        ? await getBannerPrice(placement, duration)
        : await getPromotionPrice(type === 'sponsor' ? 'dealer' : 'vehicle', duration);

    if (!actualPrice || actualPrice <= 0) {
      return NextResponse.json(
        { error: 'No hay precio configurado para esta ubicación y duración. Revisa Admin → Precios.' },
        { status: 400 }
      );
    }

    if (pricingConfig.taxRate && pricingConfig.taxRate > 0) {
      actualPrice = actualPrice * (1 + pricingConfig.taxRate / 100);
    }

    const priceDifference = Math.abs(priceNumber - actualPrice) / actualPrice;
    if (priceDifference > 0.01) {
      console.warn(`Price mismatch: sent ${priceNumber}, calculated ${actualPrice}. Using calculated price.`);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + duration);

    let resolvedLink: { linkType: ReturnType<typeof parseAdLinkType>; linkUrl: string };
    try {
      resolvedLink = resolveAdLinkForSave({
        linkType: parsedLinkType,
        linkUrl: String(linkUrl || ''),
        advertiserWebsite: advertiser.website,
      });
    } catch (linkErr: unknown) {
      const message =
        linkErr instanceof Error ? linkErr.message : 'URL de destino no válida';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const reservedSlots = await countReservedPlacementSlots(placement);
    const placementCapacity = AD_PLACEMENT_CAPACITY[placement];
    const placementSnap = await db.collection('sponsored_content').where('placement', '==', placement).get();
    const queueSetupReservationWindowMs = 45 * 60 * 1000;
    const queuedBeforeCount = placementSnap.docs.filter((doc: any) => {
      const data = doc.data() || {};
      const status = String(data.status || '');
      if (status === 'queued' || status === 'activating') return true;
      if (status !== 'queued_setup_pending') return false;
      const updatedMillis = dateLikeToMillis(data.updatedAt) ?? dateLikeToMillis(data.queuedAt);
      return updatedMillis === null || Date.now() - updatedMillis <= queueSetupReservationWindowMs;
    }).length;
    const queuePosition = queuedBeforeCount + 1;
    const mustQueue = reservedSlots >= placementCapacity || queuedBeforeCount > 0;

    if (mustQueue) {
      if (allowQueue !== true) {
        return NextResponse.json(
          {
            error:
              `${AD_PLACEMENT_LABELS[placement]} ${reservedSlots >= placementCapacity ? 'está lleno ahora mismo' : 'ya tiene una fila de espera'}. ` +
              `Hay ${reservedSlots}/${placementCapacity} espacios activos o reservados y ${queuedBeforeCount} anuncio(s) en turno. ` +
              'Puedes entrar en turno y solo se cobrará automáticamente cuando haya espacio disponible.',
            code: 'PLACEMENT_FULL',
            canQueue: true,
            placement,
            capacity: placementCapacity,
            reservedSlots,
          },
          { status: 409 }
        );
      }
    }

    if (mustQueue && allowQueue === true) {
      const stripe = await getStripeInstance();
      let stripeCustomerId = advertiser.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: advertiser.email,
          name: advertiser.companyName || advertiser.contactName || advertiser.email,
          metadata: {
            advertiserId: auth.userId,
            source: 'advertiser_ad_queue',
          },
        });
        stripeCustomerId = customer.id;
        await db.collection('advertisers').doc(auth.userId).set(
          {
            stripeCustomerId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      const ad = await createSponsoredContent({
        advertiserId: auth.userId,
        advertiserName: advertiser.companyName,
        campaignName: campaignName || undefined,
        type: type as 'banner' | 'promotion' | 'sponsor',
        placement,
        title: title || '',
        description: description || '',
        imageUrl: media === 'image' ? creative.imageUrl : '',
        images: media === 'image' ? creative.images : [],
        animation: creative.animation,
        videoUrl: media === 'video' ? videoUrl : '',
        linkUrl: resolvedLink.linkUrl,
        linkType: resolvedLink.linkType,
        targetLocation,
        targetVehicleTypes,
        budget: actualPrice,
        budgetType: 'total',
        startDate: start,
        endDate: end,
        price: actualPrice,
        durationDays: duration,
        status: 'queued_setup_pending' as any,
        billingMode: 'per_ad_queued' as const,
      });

      await db.collection('sponsored_content').doc(ad.id).set(
        {
          queuedAt: admin.firestore.FieldValue.serverTimestamp(),
          queuePosition,
          queueStatus: 'awaiting_payment_method',
          queuePlacement: placement,
          stripeCustomerId,
          paymentStatus: 'setup_pending',
          activationAttempts: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          action: 'queued_ad_setup',
          advertiserId: auth.userId,
          adId: ad.id,
          placement,
          mediaType: media,
        },
      });

      return NextResponse.json(
        {
          success: true,
          ad,
          queue: {
            queued: true,
            placement,
            queuePosition,
            capacity: placementCapacity,
            reservedSlots,
          },
          payment: {
            required: true,
            intentType: 'setup',
            clientSecret: setupIntent.client_secret,
            setupIntentId: setupIntent.id,
          },
        },
        { status: 200 }
      );
    }

    // Crear el anuncio en estado de pago pendiente
    const ad = await createSponsoredContent({
      advertiserId: auth.userId,
      advertiserName: advertiser.companyName,
      campaignName: campaignName || undefined,
      type: type as 'banner' | 'promotion' | 'sponsor',
      placement,
      title: title || '',
      description: description || '',
      imageUrl: media === 'image' ? creative.imageUrl : '',
      images: media === 'image' ? creative.images : [],
      animation: creative.animation,
      videoUrl: media === 'video' ? videoUrl : '',
      linkUrl: resolvedLink.linkUrl,
      linkType: resolvedLink.linkType,
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
      billingMode: 'per_ad' as const,
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
        placement,
        mediaType: media,
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

