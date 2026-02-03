import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Buscar el banner
    const bannerRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .doc(id);

    const bannerDoc = await bannerRef.get();
    if (!bannerDoc.exists) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const bannerData = bannerDoc.data();
    
    // Verificar límite global de banners activos (4 máximo)
    const activeBannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get();

    if (activeBannersSnapshot.size >= 4 && bannerData?.status !== 'active') {
      return NextResponse.json(
        { 
          error: 'Límite alcanzado',
          message: 'Ya hay 4 banners activos. Por favor espera a que expire alguno.'
        },
        { status: 400 }
      );
    }

    // Calcular fecha de expiración si no existe
    let expiresAt = bannerData?.expiresAt;
    if (!expiresAt && bannerData?.duration) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + bannerData.duration);
      expiresAt = admin.firestore.Timestamp.fromDate(expirationDate);
    }

    // Aprobar y activar el banner
    await bannerRef.update({
      status: 'active',
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: auth.userId,
      expiresAt: expiresAt || bannerData?.expiresAt,
      priority: activeBannersSnapshot.size + 1,
    });

    // Eliminar notificación de aprobación si existe
    const notificationsSnapshot = await db
      .collection('admin_notifications')
      .where('type', '==', 'banner_approval')
      .where('bannerId', '==', id)
      .where('tenantId', '==', tenantId)
      .get();

    for (const notificationDoc of notificationsSnapshot.docs) {
      await notificationDoc.ref.delete();
    }

    console.log(`✅ Banner ${id} aprobado por admin ${auth.userId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error approving banner:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


