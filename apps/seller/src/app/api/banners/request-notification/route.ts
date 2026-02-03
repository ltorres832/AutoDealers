import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body; // 'banner' o 'promotion'

    if (!type || (type !== 'banner' && type !== 'promotion')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "banner" or "promotion"' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una solicitud pendiente del mismo tipo
    const existingRequest = await db
      .collection('notification_requests')
      .where('userId', '==', auth.userId)
      .where('type', '==', type)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud de notificación pendiente para este tipo' },
        { status: 400 }
      );
    }

    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Crear solicitud de notificación
    const notificationRef = db.collection('notification_requests').doc();

    await notificationRef.set({
      userId: auth.userId,
      tenantId: auth.tenantId,
      userEmail: userData?.email || '',
      userName: userData?.name || '',
      type, // 'banner' o 'promotion'
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de notificación creada exitosamente',
      requestId: notificationRef.id,
    });
  } catch (error: any) {
    console.error('Error creating notification request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


