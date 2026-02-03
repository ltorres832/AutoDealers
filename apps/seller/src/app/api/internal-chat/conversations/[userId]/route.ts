import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

function getDb() {
  return getFirestore();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!otherUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getDb();
    
    // Obtener información del usuario para determinar tenantIds relevantes
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    const tenantIdsToSearch = [auth.tenantId];
    if (userData?.dealerId && userData.dealerId !== auth.tenantId) {
      tenantIdsToSearch.push(userData.dealerId);
    }

    // Eliminar todos los mensajes de la conversación entre estos dos usuarios
    for (const tenantId of tenantIdsToSearch) {
      try {
        // Buscar mensajes donde el usuario actual es el remitente o destinatario
        const messagesQuery1 = await db
          .collection('internal_messages')
          .where('tenantId', '==', tenantId)
          .where('fromUserId', '==', auth.userId)
          .where('toUserId', '==', otherUserId)
          .get();

        const messagesQuery2 = await db
          .collection('internal_messages')
          .where('tenantId', '==', tenantId)
          .where('fromUserId', '==', otherUserId)
          .where('toUserId', '==', auth.userId)
          .get();

        // Eliminar todos los mensajes encontrados
        const batch = db.batch();
        messagesQuery1.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        messagesQuery2.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        if (messagesQuery1.docs.length > 0 || messagesQuery2.docs.length > 0) {
          await batch.commit();
        }
      } catch (error: any) {
        console.warn(`Error eliminando mensajes del tenant ${tenantId}:`, error.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Conversación eliminada' });
  } catch (error: any) {
    console.error('Error eliminando conversación:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

