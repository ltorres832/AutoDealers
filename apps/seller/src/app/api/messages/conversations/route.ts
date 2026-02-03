import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads } from '@autodealers/crm';
import { getMessagesByChannel } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo obtener leads asignados al vendedor
    const leads = await getLeads(auth.tenantId, { assignedTo: auth.userId });
    const messages = await getMessagesByChannel(auth.tenantId, 'whatsapp', 1000);

    // Agrupar mensajes por leadId
    const messagesByLead: Record<string, any[]> = {};
    messages.forEach((msg) => {
      if (msg.leadId) {
        if (!messagesByLead[msg.leadId]) {
          messagesByLead[msg.leadId] = [];
        }
        messagesByLead[msg.leadId].push(msg);
      }
    });

    // Crear conversaciones solo para leads asignados
    const conversations = leads
      .filter((lead) => messagesByLead[lead.id])
      .map((lead) => {
        const leadMessages = messagesByLead[lead.id];
        const unread = leadMessages.filter((m) => !m.read && m.direction === 'inbound').length;

        return {
          leadId: lead.id,
          leadName: lead.contact.name,
          messages: leadMessages.slice(-10),
          unread,
        };
      });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





