import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { markLeadChannelMessagesRead } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const channel =
      body.channel === 'whatsapp' ||
      body.channel === 'facebook' ||
      body.channel === 'instagram' ||
      body.channel === 'email' ||
      body.channel === 'sms'
        ? body.channel
        : 'whatsapp';

    if (!leadId) {
      return NextResponse.json({ error: 'leadId requerido' }, { status: 400 });
    }

    const marked = await markLeadChannelMessagesRead(auth.tenantId, leadId, channel);
    return NextResponse.json({ success: true, marked });
  } catch (error: unknown) {
    console.error('[seller/messages/mark-read]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
