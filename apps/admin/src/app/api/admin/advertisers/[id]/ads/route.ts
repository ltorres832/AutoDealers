import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSponsoredContent, getAdvertiserById } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Admin crea un anuncio para un anunciante
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      campaignName,
      title,
      description,
      type,
      placement,
      mediaType,
      imageUrl,
      videoUrl,
      linkUrl,
      linkType,
      targetLocation,
      targetVehicleTypes,
      price,
      durationDays,
    } = body;

    if (!title || !type || !placement || !linkUrl || !durationDays) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const advertiser = await getAdvertiserById(id);
    if (!advertiser) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }

    const duration = Number(durationDays);
    if (![7, 15, 30].includes(duration)) {
      return NextResponse.json({ error: 'Duración no válida (7, 15 o 30 días)' }, { status: 400 });
    }

    // Validar medio
    const media = mediaType === 'video' ? 'video' : 'image';
    if (media === 'image' && !imageUrl) {
      return NextResponse.json({ error: 'Debes proporcionar una imagen' }, { status: 400 });
    }
    if (media === 'video' && !videoUrl) {
      return NextResponse.json({ error: 'Debes proporcionar un video' }, { status: 400 });
    }

    const priceNumber = typeof price === 'number' ? price : Number(price ?? 0);

    const start = new Date();
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + duration);

    const ad = await createSponsoredContent({
      advertiserId: advertiser.id,
      advertiserName: advertiser.companyName,
      campaignName: campaignName || '',
      type: type as 'banner' | 'promotion' | 'sponsor',
      placement: placement as 'hero' | 'sidebar' | 'sponsors_section' | 'between_content',
      title,
      description: description || '',
      imageUrl: media === 'image' ? imageUrl || '' : '',
      videoUrl: media === 'video' ? videoUrl || '' : '',
      linkUrl,
      linkType: (linkType as 'external' | 'landing_page') || 'external',
      targetLocation: targetLocation || [],
      targetVehicleTypes: targetVehicleTypes || [],
      budget: priceNumber || 0,
      budgetType: 'total',
      startDate: start,
      endDate: end,
      status: 'payment_pending', // requiere pago por el anunciante
      // extra fields
      durationDays: duration,
      price: priceNumber || 0,
      approvedAt: null,
      approvedBy: auth.userId,
    } as any);

    return NextResponse.json({ success: true, ad });
  } catch (error: any) {
    console.error('Admin create ad error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear anuncio' },
      { status: 500 }
    );
  }
}


