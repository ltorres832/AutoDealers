import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPublicChatConversations } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Para admin, obtener conversaciones de todos los tenants o de un tenant específico
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (tenantId) {
      // Conversaciones de un tenant específico
      const conversations = await getPublicChatConversations(tenantId);
      return NextResponse.json({
        conversations: conversations.map((conv) => ({
          ...conv,
          lastMessage: conv.lastMessage
            ? {
                ...conv.lastMessage,
                createdAt: conv.lastMessage.createdAt.toISOString(),
              }
            : null,
          createdAt: conv.createdAt.toISOString(),
        })),
      });
    } else {
      // Para admin sin tenantId, obtener de todos los tenants
      // Por ahora, retornar vacío o implementar lógica para obtener de todos
      return NextResponse.json({ conversations: [] });
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

