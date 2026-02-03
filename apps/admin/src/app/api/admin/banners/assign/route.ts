import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
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
      title, 
      description, 
      ctaText, 
      linkType, 
      linkValue, 
      imageUrl, 
      duration,
      assignedToUserId,
      assignedToTenantId,
      assignedToRole
    } = body;

    if (!title || !description || !imageUrl || !duration || !assignedToUserId || !assignedToTenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Obtener precio desde configuración
    const { getBannerPrice, getBannerDurations } = await import('@autodealers/core');
    const availableDurations = await (getBannerDurations as any)();
    const price = await getBannerPrice('hero', duration);

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: `Invalid duration. Available durations: ${availableDurations.join(', ')} days` },
        { status: 400 }
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

    // Crear banner asignado (pendiente de pago)
    const bannerRef = db
      .collection('tenants')
      .doc(assignedToTenantId)
      .collection('premium_banners')
      .doc();

    await bannerRef.set({
      title,
      description,
      ctaText: ctaText || 'Ver más',
      linkType: linkType || 'filter',
      linkValue: linkValue || '',
      imageUrl,
      duration,
      price,
      status: 'assigned', // Nuevo estado: asignado pero no pagado
      approved: true, // Aprobado automáticamente por el admin
      paymentStatus: 'pending', // Pendiente de pago
      assignedTo: assignedToUserId,
      assignedToTenantId,
      assignedBy: auth.userId,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      clicks: 0,
      priority: 0, // Se calculará después del pago
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notificar al usuario asignado
    await db.collection('notifications').add({
      userId: assignedToUserId,
      tenantId: assignedToTenantId,
      type: 'banner_assigned',
      title: 'Banner Premium Asignado',
      message: `Se te ha asignado un banner premium: "${title}". Realiza el pago para activarlo.`,
      metadata: {
        bannerId: bannerRef.id,
        price,
        duration,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      bannerId: bannerRef.id,
      message: 'Banner asignado exitosamente. El usuario debe realizar el pago para activarlo.',
    });
  } catch (error: any) {
    console.error('Error assigning banner:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

