import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPublicChatConversations } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await getPublicChatConversations(auth.tenantId);

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
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



