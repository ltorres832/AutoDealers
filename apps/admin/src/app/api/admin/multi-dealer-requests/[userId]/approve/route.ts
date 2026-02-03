export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getAuth } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { reviewNotes } = body;

    // Obtener la solicitud
    const requestDoc = await db.collection('multi_dealer_requests').doc(userId).get();
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== 'pending') {
      return NextResponse.json(
        { error: 'La solicitud ya fue procesada' },
        { status: 400 }
      );
    }

    // Calcular fecha de expiración (48 horas desde ahora)
    const now = new Date();
    const approvedUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas

    // Actualizar la solicitud
    await db.collection('multi_dealer_requests').doc(userId).update({
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: authUser.userId,
      reviewNotes: reviewNotes || null,
      approvedUntil: admin.firestore.Timestamp.fromDate(approvedUntil),
    });

    // Habilitar el usuario en Firebase Auth
    await auth.updateUser(userId, {
      disabled: false,
    });

    // Actualizar el usuario en Firestore
    await db.collection('users').doc(userId).update({
      status: 'active',
      multiDealerAccess: true,
      multiDealerAccessUntil: admin.firestore.Timestamp.fromDate(approvedUntil),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Crear notificación para el usuario
    await db.collection('notifications').add({
      type: 'multi_dealer_approved',
      title: 'Solicitud Multi Dealer Aprobada',
      message: `Tu solicitud Multi Dealer ha sido aprobada. Tienes acceso por 48 horas hasta ${approvedUntil.toLocaleString('es-ES')}`,
      userId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        approvedUntil: approvedUntil.toISOString(),
        membershipId: requestData.membershipId,
      },
    });

    // Enviar email de notificación (opcional, si tienes servicio de email configurado)
    // await sendEmail(...)

    return NextResponse.json({
      success: true,
      message: 'Solicitud aprobada exitosamente',
      approvedUntil: approvedUntil.toISOString(),
    });
  } catch (error: any) {
    console.error('Error approving multi dealer request:', error);
    return NextResponse.json(
      { error: 'Error al aprobar solicitud', details: error.message },
      { status: 500 }
    );
  }
}


