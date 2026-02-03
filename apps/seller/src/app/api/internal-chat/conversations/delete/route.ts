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
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('userId');

    if (!otherUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    
    // Obtener información del usuario actual
    const currentUserDoc = await db.collection('users').doc(auth.userId).get();
    const currentUserData = currentUserDoc.data();
    
    // Obtener información del otro usuario
    const otherUserDoc = await db.collection('users').doc(otherUserId).get();
    const otherUserData = otherUserDoc.data();

    // Determinar los tenantIds donde buscar mensajes
    let tenantIdsToSearch = [auth.tenantId];
    
    if (currentUserData?.dealerId && otherUserData?.tenantId === currentUserData.dealerId) {
      tenantIdsToSearch = [currentUserData.dealerId];
    } else if (otherUserData?.tenantId && otherUserData.tenantId !== auth.tenantId) {
      tenantIdsToSearch = [auth.tenantId, otherUserData.tenantId];
    }

    // Obtener todos los mensajes de la conversación
    const allMessages: any[] = [];
    for (const tenantId of tenantIdsToSearch) {
      if (!tenantId) continue;
      try {
        const messages = await getInternalMessages(tenantId, auth.userId, otherUserId);
        allMessages.push(...messages);
      } catch (error: any) {
        console.warn(`Error obteniendo mensajes del tenant ${tenantId || 'unknown'}:`, error.message);
      }
    }

    // Eliminar duplicados por ID
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    );

    // Eliminar todos los mensajes
    const deletePromises = uniqueMessages.map(async (msg) => {
      try {
        await db
          .collection('tenants')
          .doc(msg.tenantId)
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
      deletedCount: uniqueMessages.length 
    });
  } catch (error: any) {
    console.error('Error eliminando conversación:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

