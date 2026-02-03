import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPublicChatMessages, createPublicChatMessage, markPublicChatMessagesAsRead } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const messages = await getPublicChatMessages(auth.tenantId, sessionId);

    // Marcar mensajes como leídos
    await markPublicChatMessagesAsRead(auth.tenantId, sessionId, auth.userId);

    return NextResponse.json({
      messages: messages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        readAt: msg.readAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, content } = body;

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: 'sessionId and content are required' },
        { status: 400 }
      );
    }

    // Obtener información del usuario actual
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();

    // Obtener información del cliente de la sesión
    const messages = await getPublicChatMessages(auth.tenantId, sessionId);
    const firstMessage = messages.find((m) => m.fromClient);
    const clientName = firstMessage?.clientName || 'Cliente';
    const clientEmail = firstMessage?.clientEmail;
    const clientPhone = firstMessage?.clientPhone;

    const message = await createPublicChatMessage(
      auth.tenantId,
      sessionId,
      clientName,
      clientEmail,
      clientPhone,
      false, // fromClient = false (es del vendedor)
      content,
      auth.userId,
      userData?.name || userData?.email || 'Vendedor'
    );

    return NextResponse.json({
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString(),
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



