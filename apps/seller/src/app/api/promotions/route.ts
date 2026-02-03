import { NextRequest, NextResponse } from 'next/server';
import { createPromotion, getPromotions, createNotification, canExecuteFeature, getAvailableCredits, useRewardCredit } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const promotions = await getPromotions(auth.tenantId);

    return NextResponse.json({
      promotions: promotions.map((p) => ({
        ...p,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validar campos requeridos
    if (!body.name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    if (!body.description) {
      return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 });
    }

    // El descuento es opcional si es promoción para landing page
    if (!body.isFreePromotion && (!body.discount || !body.discount.value || body.discount.value <= 0)) {
      return NextResponse.json({ error: 'El descuento es requerido y debe ser mayor a 0' }, { status: 400 });
    }

    if (!body.startDate) {
      return NextResponse.json({ error: 'La fecha de inicio es requerida' }, { status: 400 });
    }

    // Validar que startDate sea una fecha válida
    let startDate: Date;
    try {
      startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'La fecha de inicio no es válida' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'La fecha de inicio no es válida' }, { status: 400 });
    }

    let endDate: Date | undefined;
    if (body.endDate) {
      try {
        endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({ error: 'La fecha de fin no es válida' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'La fecha de fin no es válida' }, { status: 400 });
      }
    }

    // Verificar si es una promoción gratuita para el landing (no pagada)
    const isFreePromotion = body.isFreePromotion === true && !body.isPaid;
    
    // Si es promoción gratuita para landing, validar feature y límite global
    if (isFreePromotion) {
      const featureCheck = await canExecuteFeature(auth.tenantId, 'publishFreePromotion');
      if (!featureCheck.allowed) {
        return NextResponse.json(
          { error: featureCheck.reason || 'Su membresía no incluye promociones gratuitas en el landing page' },
          { status: 403 }
        );
      }

      // Verificar límite global de promociones activas (12 máximo)
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      
      // Contar promociones pagadas activas
      const paidActivePromotions = await db
        .collectionGroup('promotions')
        .where('isPaid', '==', true)
        .where('status', '==', 'active')
        .get();

      // Contar promociones gratuitas activas
      const freeActivePromotions = await db
        .collectionGroup('promotions')
        .where('isFreePromotion', '==', true)
        .where('isPaid', '==', false)
        .where('status', '==', 'active')
        .get();

      const totalActive = paidActivePromotions.size + freeActivePromotions.size;

      if (totalActive >= 12) {
        return NextResponse.json(
          { 
            error: 'Límite alcanzado',
            message: 'Ya hay 12 promociones activas en la landing page. Por favor espera a que expire alguna.',
            limitReached: true,
            availableSlots: 0
          },
          { status: 400 }
        );
      }
    }

    const promotionData: any = {
      tenantId: auth.tenantId,
      name: body.name,
      description: body.description || '',
      type: body.type || 'discount',
      discount: body.discount,
      applicableVehicles: body.applicableVehicles || [],
      applicableToAll: body.applicableToAll !== undefined ? body.applicableToAll : true,
      startDate: startDate,
      endDate: endDate,
      status: body.status || 'active',
      autoSendToLeads: body.autoSendToLeads || false,
      autoSendToCustomers: body.autoSendToCustomers || false,
      channels: body.channels || ['whatsapp'],
      aiGenerated: body.aiGenerated || false,
      isPaid: body.isPaid || false,
      isFreePromotion: isFreePromotion, // Marcar como promoción gratuita para landing
    };

    // Agregar imágenes y videos si existen
    if (body.images && body.images.length > 0) {
      promotionData.images = body.images;
    }
    if (body.videos && body.videos.length > 0) {
      promotionData.videos = body.videos;
    }

    // Si se solicita usar crédito de referido, verificar y usar
    if (body.useCredit === true) {
      const availableCredits = await getAvailableCredits(auth.userId, 'promotion');
      if (availableCredits.length > 0) {
        const creditId = availableCredits[0].id;
        // Usar el crédito antes de crear la promoción
        const success = await useRewardCredit(creditId, promotionData.name);
        if (success) {
          // Marcar la promoción como pagada ya que usó crédito
          promotionData.isPaid = true;
          promotionData.usedCreditId = creditId;
        }
      }
    }

    const promotion = await createPromotion(promotionData);

    // Crear notificación
    try {
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'system_alert',
        title: 'Promoción Creada',
        message: `Se ha creado la promoción: ${body.name}`,
        channels: ['system'],
        metadata: { promotionId: promotion.id },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // No fallar la creación de la promoción si falla la notificación
    }

    return NextResponse.json({ 
      promotion: {
        ...promotion,
        startDate: promotion.startDate.toISOString(),
        endDate: promotion.endDate?.toISOString(),
        createdAt: promotion.createdAt.toISOString(),
        updatedAt: promotion.updatedAt.toISOString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

