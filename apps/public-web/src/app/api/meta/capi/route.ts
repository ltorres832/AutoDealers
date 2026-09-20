import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCapiEvent } from '@/lib/meta-capi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set(['PageView', 'Lead', 'CompleteRegistration']);

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || '';
  return request.headers.get('x-real-ip') || '';
}

function cookieValue(request: NextRequest, name: string): string | undefined {
  const value = request.cookies.get(name)?.value?.trim();
  return value || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      event?: string;
      eventId?: string;
      eventSourceUrl?: string;
      fbp?: string;
      fbc?: string;
      customData?: Record<string, unknown>;
    };

    const event = typeof body.event === 'string' ? body.event.trim() : '';
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    if (!ALLOWED_EVENTS.has(event) || !eventId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const eventSourceUrl =
      typeof body.eventSourceUrl === 'string' && body.eventSourceUrl.startsWith('https://')
        ? body.eventSourceUrl.slice(0, 2000)
        : undefined;

    const result = await sendMetaCapiEvent({
      eventName: event,
      eventId,
      eventSourceUrl,
      customData: body.customData,
      user: {
        clientIp: clientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
        fbp: (typeof body.fbp === 'string' && body.fbp.trim()) || cookieValue(request, '_fbp'),
        fbc: (typeof body.fbc === 'string' && body.fbc.trim()) || cookieValue(request, '_fbc'),
      },
    });

    return NextResponse.json({ ok: result.ok, skipped: result.skipped ?? null });
  } catch (error) {
    console.error('[meta-capi] route error', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
