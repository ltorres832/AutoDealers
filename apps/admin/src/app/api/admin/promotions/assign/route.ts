import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getPromotionPrice, getPromotionDurations } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      promotionScope,
      vehicleId,
      duration,
      assignedToUserId,
      assignedToTenantId,
      assignedToRole,
      name,
      description,
    } = body;

    if (!promotionScope || !['vehicle', 'dealer', 'seller'].includes(promotionScope)) {
      return NextResponse.json(
        { error: 'Invalid promotion scope' },
        { status: 400 }
      );
    }

    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required' },
        { status: 400 }
      );
    }

    if (!assignedToUserId || !assignedToTenantId) {
      return NextResponse.json(
        { error: 'Missing assigned user information' },
        { status: 400 }
      );
    }

    if (promotionScope === 'vehicle' && !vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required for vehicle promotions' },
        { status: 400 }
      );
    }

    // Validar que el usuario asignado existe y tiene el rol correcto
    const assignedUserDoc = await db.collection('users').doc(assignedToUserId).get();
    if (!assignedUserDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario asignado no encontrado' },
        { status: 404 }
      );
    }

    const assignedUserData = assignedUserDoc.data();
    if (assignedUserData?.role !== assignedToRole || assignedUserData?.tenantId !== assignedToTenantId) {
      return NextResponse.json(
        { error: 'Usuario no coincide con los datos proporcionados' },
        { status: 400 }
      );
    }

    // Validar duración
    const availableDurations = await getPromotionDurations(promotionScope);
    if (!availableDurations.includes(duration)) {
      return NextResponse.json(
        { error: `Invalid duration. Available: ${availableDurations.join(', ')} days` },
        { status: 400 }
      );
    }

    // Obtener precio desde configuración
    const price = await getPromotionPrice(promotionScope, duration);
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid price configuration' },
        { status: 400 }
      );
    }

    // Verificar límite global de promociones activas
    const { getPricingConfig } = await import('@autodealers/core');
    const pricingConfig = await getPricingConfig();
    const maxActive = pricingConfig.limits.maxActivePromotions;

    const activePromotionsSnapshot = await db
      .collectionGroup('promotions')
      .where('isPaid', '==', true)
      .where('status', '==', 'active')
      .get();

    if (activePromotionsSnapshot.size >= maxActive) {
      return NextResponse.json(
        { 
          error: 'Límite alcanzado',
          message: `Ya hay ${maxActive} promociones activas. Por favor espera a que expire alguna.`
        },
        { status: 400 }
      );
    }

    // Crear solicitud de promoción asignada (pendiente de pago)
    const requestRef = db
      .collection('tenants')
      .doc(assignedToTenantId)
      .collection('paid_promotion_requests')
      .doc();

    await requestRef.set({
      promotionScope,
      vehicleId: vehicleId || null,
      duration,
      price,
      name: name || `Promoción ${promotionScope} - ${duration} días`,
      description: description || '',
      status: 'assigned', // Nuevo estado: asignado pero no pagado
      paymentStatus: 'pending', // Pendiente de pago
      assignedTo: assignedToUserId,
      assignedToTenantId,
      assignedBy: auth.userId,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      requestedBy: assignedToUserId,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notificar al usuario asignado
    await db.collection('notifications').add({
      userId: assignedToUserId,
      tenantId: assignedToTenantId,
      type: 'promotion_assigned',
      title: 'Promoción Asignada',
      message: `Se te ha asignado una promoción ${promotionScope}: "${name || `Promoción ${promotionScope} - ${duration} días`}". Realiza el pago para activarla.`,
      metadata: {
        promotionRequestId: requestRef.id,
        promotionScope,
        price,
        duration,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      promotionRequestId: requestRef.id,
      message: 'Promoción asignada exitosamente. El usuario debe realizar el pago para activarla.',
    });
  } catch (error: any) {
    console.error('Error assigning promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


