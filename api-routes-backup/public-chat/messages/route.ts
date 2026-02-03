import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPublicChatMessage, getPublicChatMessages } = require('@autodealers/crm') as any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const tenantId = searchParams.get('tenantId');

    if (!sessionId || !tenantId) {
      return NextResponse.json(
        { error: 'sessionId and tenantId are required' },
        { status: 400 }
      );
    }

    console.log('📥 GET /api/public-chat/messages:', { sessionId, tenantId });

    const messages = await getPublicChatMessages(tenantId, sessionId);

    console.log('✅ Mensajes obtenidos:', messages.length);

    return NextResponse.json({
      messages: messages.map((msg: any) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        readAt: msg.readAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('❌ Error fetching messages:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      sessionId,
      clientName,
      clientEmail,
      clientPhone,
      content,
    } = body;

    if (!tenantId || !sessionId || !clientName || !content) {
      return NextResponse.json(
        { error: 'tenantId, sessionId, clientName, and content are required' },
        { status: 400 }
      );
    }

    console.log('📤 POST /api/public-chat/messages:', { tenantId, sessionId, clientName });

    const message = await createPublicChatMessage(
      tenantId,
      sessionId,
      clientName,
      clientEmail,
      clientPhone,
      true, // fromClient
      content
    );

    console.log('✅ Mensaje creado:', message.id);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating message:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}



