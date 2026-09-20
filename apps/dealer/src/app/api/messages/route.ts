import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { sendWhatsAppMessageToLead } from '@autodealers/core';
import { getMessagesByChannel } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const channel = searchParams.get('channel') || 'whatsapp';

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 });
    }

    const messages = await getMessagesByChannel(auth.tenantId, channel as 'whatsapp', 100);
    const leadMessages = messages.filter((m) => m.leadId === leadId);

    return NextResponse.json({
      messages: leadMessages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const channel = body.channel || 'whatsapp';

    if (!leadId || !content) {
      return NextResponse.json(
        { error: 'leadId y content son requeridos' },
        { status: 400 }
      );
    }

    if (channel !== 'whatsapp') {
      return NextResponse.json(
        { error: 'Canal no soportado desde esta bandeja. Usa WhatsApp.' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessageToLead({
      tenantId: auth.tenantId,
      leadId,
      content,
      senderUserId: auth.userId,
      aiGenerated: Boolean(body.aiGenerated),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'No se pudo enviar por WhatsApp',
          message: result.message,
          whatsappSent: false,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        message: result.message,
        whatsappSent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
