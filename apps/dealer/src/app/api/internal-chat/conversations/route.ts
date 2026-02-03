import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getInternalConversations } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await getInternalConversations(auth.tenantId, auth.userId);

    return NextResponse.json({
      conversations: conversations.map((conv) => {
        // Convertir lastMessage a string si es un objeto
        let lastMessageStr: string | null = null;
        let lastMessageTime: Date | null = null;
        
        if (conv.lastMessage) {
          if (typeof conv.lastMessage === 'string') {
            lastMessageStr = conv.lastMessage;
          } else if (conv.lastMessage.content) {
            lastMessageStr = conv.lastMessage.content;
            const createdAt = (conv.lastMessage as any).createdAt;
            if (createdAt instanceof Date) {
              lastMessageTime = createdAt;
            } else if (createdAt && typeof createdAt.toDate === 'function') {
              lastMessageTime = createdAt.toDate();
            } else {
              lastMessageTime = new Date();
            }
          }
        }
        
        return {
          userId: conv.otherUserId, // Mapear otherUserId a userId para el frontend
          userName: conv.otherUserName || 'Usuario', // Mapear otherUserName a userName para el frontend
          otherUserId: conv.otherUserId, // Mantener para compatibilidad
          otherUserName: conv.otherUserName || 'Usuario', // Mantener para compatibilidad
          lastMessage: lastMessageStr,
          lastMessageTime: lastMessageTime ? lastMessageTime.toISOString() : null,
          unreadCount: conv.unreadCount || 0,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



