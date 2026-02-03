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
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: otherUserId } = await params;
    if (!otherUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getDb();

    // Eliminar todos los mensajes de la conversación entre estos dos usuarios
    try {
      // Buscar mensajes donde el usuario actual es el remitente o destinatario
      const messagesQuery1 = await db
        .collection('internal_messages')
        .where('tenantId', '==', auth.tenantId)
        .where('fromUserId', '==', auth.userId)
        .where('toUserId', '==', otherUserId)
        .get();

      const messagesQuery2 = await db
        .collection('internal_messages')
        .where('tenantId', '==', auth.tenantId)
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
      console.warn('Error eliminando mensajes:', error.message);
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

