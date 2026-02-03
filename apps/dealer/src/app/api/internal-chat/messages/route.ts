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
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const messages = await getInternalMessages(auth.tenantId, auth.userId, userId);

    return NextResponse.json({
      messages: messages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        readAt: msg.readAt?.toISOString(),
      })),
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

    const message = await createInternalMessage(
      auth.tenantId,
      auth.userId,
      currentUserData?.name || currentUserData?.email || 'Usuario',
      toUserId,
      toUserData?.name || toUserData?.email || 'Usuario',
      content
    );

    console.log('✅ Mensaje creado exitosamente:', {
      messageId: message.id,
      fromUserId: auth.userId,
      toUserId,
      tenantId: auth.tenantId,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating message:', error.message || error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



