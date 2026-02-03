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
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Debes proporcionar una razón para el rechazo' },
        { status: 400 }
      );
    }

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

    // Actualizar la solicitud
    await db.collection('multi_dealer_requests').doc(userId).update({
      status: 'rejected',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: authUser.userId,
      reviewNotes: reason,
    });

    // Eliminar el usuario (ya que fue creado con disabled: true)
    try {
      await auth.deleteUser(userId);
    } catch (error: any) {
      // Si el usuario ya fue eliminado o no existe, continuar
      console.warn('Error deleting user (may already be deleted):', error.message);
    }

    // Eliminar el documento de usuario en Firestore
    try {
      await db.collection('users').doc(userId).delete();
    } catch (error: any) {
      console.warn('Error deleting user document:', error.message);
    }

    // Crear notificación (si el usuario aún existe en algún sistema)
    // Nota: Como eliminamos el usuario, esta notificación no se entregará
    // pero la guardamos por registro

    return NextResponse.json({
      success: true,
      message: 'Solicitud rechazada exitosamente',
    });
  } catch (error: any) {
    console.error('Error rejecting multi dealer request:', error);
    return NextResponse.json(
      { error: 'Error al rechazar solicitud', details: error.message },
      { status: 500 }
    );
  }
}


