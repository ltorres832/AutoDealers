import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPublicChatConversations } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (tenantId) {
      const conversations = await getPublicChatConversations(tenantId);
      return NextResponse.json({
        conversations: conversations.map((conv) => ({
          ...conv,
          tenantId,
          lastMessage: conv.lastMessage
            ? {
                ...conv.lastMessage,
                createdAt: conv.lastMessage.createdAt.toISOString(),
              }
            : null,
          createdAt: conv.createdAt.toISOString(),
        })),
      });
    }

    const db = getFirestore();
    const tenantsSnap = await db.collection('tenants').limit(200).get();
    const all: Array<Record<string, unknown>> = [];

    await Promise.all(
      tenantsSnap.docs.map(async (tenantDoc) => {
        const tid = tenantDoc.id;
        try {
          const conversations = await getPublicChatConversations(tid);
          conversations.forEach((conv) => {
            all.push({
              ...conv,
              tenantId: tid,
              tenantName: tenantDoc.data()?.name || tenantDoc.data()?.companyName || tid,
              lastMessage: conv.lastMessage
                ? {
                    ...conv.lastMessage,
                    createdAt: conv.lastMessage.createdAt.toISOString(),
                  }
                : null,
              createdAt: conv.createdAt.toISOString(),
            });
          });
        } catch {
          /* tenant sin chat */
        }
      })
    );

    all.sort((a, b) => {
      const ta = new Date((a.lastMessage as { createdAt?: string })?.createdAt || (a.createdAt as string)).getTime();
      const tb = new Date((b.lastMessage as { createdAt?: string })?.createdAt || (b.createdAt as string)).getTime();
      return tb - ta;
    });

    return NextResponse.json({ conversations: all.slice(0, 100) });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
