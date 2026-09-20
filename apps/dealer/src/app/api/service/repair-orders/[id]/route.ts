import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getRepairOrder,
  updateRepairOrder,
  repairOrderPlainText,
  invoiceFromRepairOrder,
} from '@autodealers/crm';
import { consumePartForRo } from '@autodealers/inventory';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(_req);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const order = await getRepairOrder(auth.tenantId, id);
    if (!order) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    const format = new URL(_req.url).searchParams.get('format');
    if (format === 'text') {
      return new NextResponse(repairOrderPlainText(order), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'invoice') {
      const order = await getRepairOrder(auth.tenantId, id);
      if (!order) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
      const invoice = await invoiceFromRepairOrder(auth.tenantId, order, auth.userId);
      return NextResponse.json({ invoice });
    }

    if (action === 'estimate') {
      const { createEstimateFromRepairOrder } = await import('@autodealers/crm');
      const order = await getRepairOrder(auth.tenantId, id);
      if (!order) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
      const estimate = await createEstimateFromRepairOrder(auth.tenantId, order, auth.userId);
      return NextResponse.json({ estimate });
    }

    if (action === 'consume_parts') {
      const order = await getRepairOrder(auth.tenantId, id);
      if (!order) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
      for (const line of order.parts) {
        if (line.partId && line.qty > 0) {
          await consumePartForRo(auth.tenantId, line.partId, line.qty);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const patch: any = {};
    for (const k of [
      'status',
      'customerName',
      'customerPhone',
      'customerEmail',
      'vehicleLabel',
      'vin',
      'plate',
      'diagnosis',
      'notes',
      'tax',
      'labor',
      'parts',
      'complaints',
      'photos',
      'videos',
      'technicianId',
      'hoursLogged',
      'advisorId',
      'leadId',
      'appointmentId',
    ]) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    const order = await updateRepairOrder(auth.tenantId, id, patch);
    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
