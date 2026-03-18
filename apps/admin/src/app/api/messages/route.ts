import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createMessage } from '@autodealers/crm';
import { createNotification } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, channel, content, direction = 'outbound' } = body;

    if (!leadId || !channel || !content) {
      return NextResponse.json(
        { error: 'leadId, channel y content son requeridos' },
        { status: 400 }
      );
    }

    // Crear mensaje
    const message = await createMessage({
      tenantId: auth.tenantId,
      leadId,
      channel: channel as any,
      direction: direction as 'inbound' | 'outbound',
      from: auth.userId || '',
      to: '', // Se obtendrá del lead
      content,
      status: 'sent',
      aiGenerated: false,
      metadata: {},
    });

    // Crear notificación si es mensaje entrante (para el vendedor asignado)
    if (direction === 'inbound') {
      try {
        // Obtener lead para saber quién está asignado
        const { getLeadById } = await import('@autodealers/crm');
        const lead = await getLeadById(auth.tenantId, leadId);
        
        if (lead?.assignedTo) {
          await createNotification({
            tenantId: auth.tenantId,
            userId: lead.assignedTo,
            type: 'message_received',
            title: 'Nuevo mensaje recibido',
            message: `Has recibido un mensaje de ${lead.contact.name || 'un cliente'}`,
            channels: ['system'],
            metadata: {
              leadId,
              messageId: message.id,
              route: `/leads/${leadId}`,
            },
          });
        }
      } catch (notifError) {
        console.warn('No se pudo crear notificación:', notifError);
        // No fallar si la notificación falla
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
