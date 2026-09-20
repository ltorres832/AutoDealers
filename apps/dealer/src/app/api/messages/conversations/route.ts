import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getLeads, getMessagesByChannel } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let leads: Awaited<ReturnType<typeof getLeads>> = [];
    let messages: Awaited<ReturnType<typeof getMessagesByChannel>> = [];
    try {
      leads = await getLeads(auth.tenantId);
    } catch (e) {
      console.warn('conversations getLeads', e);
    }
    try {
      messages = await getMessagesByChannel(auth.tenantId, 'whatsapp', 1000);
    } catch (e) {
      console.warn('conversations getMessagesByChannel', e);
    }

    const messagesByLead: Record<string, any[]> = {};
    for (const msg of messages || []) {
      if (!msg?.leadId) continue;
      if (!messagesByLead[msg.leadId]) messagesByLead[msg.leadId] = [];
      messagesByLead[msg.leadId].push(msg);
    }

    const conversations = (leads || [])
      .filter((lead) => messagesByLead[lead.id])
      .map((lead) => {
        const leadMessages = messagesByLead[lead.id] || [];
        const unread = leadMessages.filter((m) => !m.read && m.direction === 'inbound').length;
        return {
          leadId: lead.id,
          leadName: lead.contact?.name || 'Sin nombre',
          messages: leadMessages.slice(-10),
          unread,
        };
      });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ conversations: [] });
  }
}
