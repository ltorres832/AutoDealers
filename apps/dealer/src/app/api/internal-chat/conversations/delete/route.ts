import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getInternalMessages } from '@autodealers/crm';

function getDb() {
  return getFirestore();
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('userId');

    if (!otherUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    
    // Obtener todos los mensajes de la conversación
    const messages = await getInternalMessages(auth.tenantId, auth.userId, otherUserId);

    // Eliminar todos los mensajes
    const tenantId = auth.tenantId!;
    const deletePromises = messages.map(async (msg) => {
      try {
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('internal_messages')
          .doc(msg.id)
          .delete();
      } catch (error: any) {
        console.warn(`Error eliminando mensaje ${msg.id}:`, error.message);
      }
    });

    await Promise.all(deletePromises);

    return NextResponse.json({ 
      success: true,
      deletedCount: messages.length 
    });
  } catch (error: any) {
    console.error('Error eliminando conversación:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

