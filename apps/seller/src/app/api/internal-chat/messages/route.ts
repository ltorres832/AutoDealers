import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getInternalMessages, createInternalMessage } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

// Lazy initialization para evitar dependencias circulares
function getDb() {
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    
    // Obtener información del usuario actual para determinar el tenantId correcto
    const currentUserDoc = await db.collection('users').doc(auth.userId).get();
    const currentUserData = currentUserDoc.data();
    
    // Obtener información del otro usuario para determinar su tenantId
    const otherUserDoc = await db.collection('users').doc(userId).get();
    const otherUserData = otherUserDoc.data();

    // Determinar el tenantId correcto para buscar mensajes
    // Si el seller tiene dealerId, usar el tenantId del dealer
    // Si ambos usuarios tienen el mismo tenantId, usar ese
    // Si son diferentes, buscar en ambos tenants
    let tenantIdsToSearch = [auth.tenantId];
    
    if (currentUserData?.dealerId && otherUserData?.tenantId === currentUserData.dealerId) {
      // El seller está buscando mensajes con su dealer
      tenantIdsToSearch = [currentUserData.dealerId];
    } else if (otherUserData?.tenantId && otherUserData.tenantId !== auth.tenantId) {
      // Los usuarios tienen diferentes tenantIds, buscar en ambos
      tenantIdsToSearch = [auth.tenantId, otherUserData.tenantId];
    }

    // Logging reducido - solo en desarrollo

    // Buscar mensajes en todos los tenants relevantes
    const allMessages: any[] = [];
    for (const tenantId of tenantIdsToSearch) {
      if (!tenantId) continue;
      try {
        const messages = await getInternalMessages(tenantId, auth.userId, userId);
        allMessages.push(...messages);
      } catch (error: any) {
        console.warn(`⚠️ Error obteniendo mensajes del tenant ${tenantId || 'unknown'}:`, error.message);
      }
    }

    // Eliminar duplicados por ID y ordenar por fecha
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    ).sort((a, b) => {
      const aTime = a.createdAt instanceof Date 
        ? a.createdAt.getTime() 
        : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
      const bTime = b.createdAt instanceof Date 
        ? b.createdAt.getTime() 
        : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
      return aTime - bTime;
    });

    // Logging reducido

    return NextResponse.json({
      messages: uniqueMessages.map((msg) => {
        // Asegurar que createdAt sea un Date válido
        let createdAtDate: Date;
        if (msg.createdAt instanceof Date) {
          createdAtDate = msg.createdAt;
        } else if (msg.createdAt?.toDate) {
          createdAtDate = msg.createdAt.toDate();
        } else if (typeof msg.createdAt === 'string') {
          createdAtDate = new Date(msg.createdAt);
        } else {
          createdAtDate = new Date();
        }

        // Asegurar que solo se devuelvan las propiedades del mensaje interno
        return {
          id: msg.id,
          tenantId: msg.tenantId,
          fromUserId: msg.fromUserId,
          fromUserName: msg.fromUserName || 'Usuario',
          toUserId: msg.toUserId,
          toUserName: msg.toUserName || 'Usuario',
          content: msg.content || '',
          createdAt: createdAtDate.toISOString(),
          read: msg.read || false,
          readAt: msg.readAt 
            ? (msg.readAt instanceof Date 
                ? msg.readAt.toISOString() 
                : (msg.readAt?.toDate ? msg.readAt.toDate().toISOString() : null))
            : null,
        };
      }),
    });
  } catch (error: any) {
    console.error('❌ Error fetching messages:', error.message || error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toUserId, content } = body;

    if (!toUserId || !content) {
      return NextResponse.json(
        { error: 'toUserId and content are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Obtener información del usuario actual
    const currentUserDoc = await db.collection('users').doc(auth.userId).get();
    const currentUserData = currentUserDoc.data();

    // Obtener información del usuario destinatario
    const toUserDoc = await db.collection('users').doc(toUserId).get();
    const toUserData = toUserDoc.data();

    if (!toUserDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determinar el tenantId correcto para guardar el mensaje
    // Si el seller tiene dealerId y está enviando al dealer, usar el tenantId del dealer
    // Si está enviando a otro seller, usar el tenantId del seller actual
    let tenantIdToUse = auth.tenantId;
    
    if (currentUserData?.dealerId && toUserData?.tenantId === currentUserData.dealerId) {
      // El seller está enviando mensaje a su dealer
      tenantIdToUse = currentUserData.dealerId;
    } else if (toUserData?.tenantId && toUserData.tenantId !== auth.tenantId) {
      // El destinatario tiene un tenantId diferente, usar el del destinatario
      tenantIdToUse = toUserData.tenantId;
    }

    // Logging reducido - solo en desarrollo

    const message = await createInternalMessage(
      tenantIdToUse,
      auth.userId,
      currentUserData?.name || currentUserData?.email || 'Usuario',
      toUserId,
      toUserData?.name || toUserData?.email || 'Usuario',
      content
    );

    // Logging reducido

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating message (seller):', error.message || error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



