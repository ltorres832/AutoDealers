import { NextRequest, NextResponse } from 'next/server';
import { processFIEmailReplyWebhook } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await processFIEmailReplyWebhook(body));
  } catch (error: unknown) {
    console.error('Error procesando respuesta de email F&I:', error);
    return NextResponse.json({
      received: true,
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'FI Email Reply Webhook está activo',
    endpoint: '/api/fi/email-reply',
  });
}
