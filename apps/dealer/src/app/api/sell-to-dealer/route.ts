import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  listSellToDealerRequests,
  getSellToDealerRequest,
  listSellToDealerMessages,
  addSellToDealerMessage,
  createSellToDealerOffer,
  updateSellToDealerStatus,
  type SellToDealerStatus,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const req = await getSellToDealerRequest(auth.tenantId, id);
      if (!req) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      }
      const messages = await listSellToDealerMessages(auth.tenantId, id);
      return NextResponse.json({ request: req, messages });
    }

    const status = request.nextUrl.searchParams.get('status') as SellToDealerStatus | null;
    const list = await listSellToDealerRequests(auth.tenantId, {
      limit: 100,
      status: status || undefined,
    });
    return NextResponse.json({ requests: list });
  } catch (e) {
    console.error('GET sell-to-dealer:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const requestId = String(body.requestId || '').trim();
    if (!requestId) {
      return NextResponse.json({ error: 'requestId requerido' }, { status: 400 });
    }

    const action = String(body.action || 'message');

    if (action === 'message') {
      const content = String(body.content || '').trim();
      if (!content) {
        return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
      }
      const msg = await addSellToDealerMessage(auth.tenantId, requestId, {
        fromClient: false,
        content,
        fromUserId: auth.userId,
        fromUserName: auth.email || 'Dealer',
      });
      return NextResponse.json({ ok: true, message: msg });
    }

    if (action === 'offer') {
      const amount = Number(body.amount);
      const updated = await createSellToDealerOffer(auth.tenantId, requestId, {
        amount,
        currency: body.currency || 'USD',
        message: body.message,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdBy: auth.userId,
        createdByName: auth.email || 'Dealer',
      });
      return NextResponse.json({ ok: true, request: updated });
    }

    if (action === 'status') {
      const status = String(body.status || '') as SellToDealerStatus;
      const updated = await updateSellToDealerStatus(auth.tenantId, requestId, status, {
        dealerNotes: body.dealerNotes,
        assignedTo: body.assignedTo,
      });
      return NextResponse.json({ ok: true, request: updated });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e) {
    console.error('POST sell-to-dealer:', e);
    const message = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
