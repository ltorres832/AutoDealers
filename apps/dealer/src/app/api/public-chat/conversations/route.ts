import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPublicChatConversations } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await getPublicChatConversations(auth.tenantId);

    return NextResponse.json({
      conversations: conversations.map((conv) => ({
        sessionId: conv.sessionId,
        clientName: conv.clientName,
        clientEmail: conv.clientEmail,
        clientPhone: conv.clientPhone,
        lastMessage: conv.lastMessage?.content
          ? String(conv.lastMessage.content).slice(0, 280)
          : null,
        lastMessageAt: conv.lastMessage?.createdAt
          ? conv.lastMessage.createdAt.toISOString()
          : null,
        unreadCount: conv.unreadCount,
        createdAt: conv.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



