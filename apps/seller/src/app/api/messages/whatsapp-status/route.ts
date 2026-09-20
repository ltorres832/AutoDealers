import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getWhatsAppConnectionStatus } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getWhatsAppConnectionStatus(auth.tenantId);
    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('[seller/messages/whatsapp-status]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
