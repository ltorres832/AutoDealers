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
    const { tenantId, reason } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
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

    // Rechazar el banner
    await bannerRef.update({
      status: 'rejected',
      approved: false,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectedBy: auth.userId,
      rejectionReason: reason.trim(),
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

    // TODO: Enviar email al dealer notificando el rechazo

    console.log(`❌ Banner ${id} rechazado por admin ${auth.userId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting banner:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


