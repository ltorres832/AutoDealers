import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { createRepairOrder, listRepairOrders } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const status = new URL(request.url).searchParams.get('status') as any;
    const orders = await listRepairOrders(auth.tenantId, { status, limit: 100 });
    return NextResponse.json({ orders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    if (!body.customerName) {
      return NextResponse.json({ error: 'customerName requerido' }, { status: 400 });
    }
    const complaints = Array.isArray(body.complaints)
      ? body.complaints.map(String).filter(Boolean)
      : String(body.complaints || '')
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean);

    const order = await createRepairOrder({
      tenantId: auth.tenantId,
      status: body.status || 'intake',
      customerName: String(body.customerName),
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      leadId: body.leadId,
      vehicleId: body.vehicleId,
      vehicleLabel: body.vehicleLabel,
      vin: body.vin,
      plate: body.plate,
      appointmentId: body.appointmentId,
      complaints,
      diagnosis: body.diagnosis,
      labor: body.labor || [],
      parts: body.parts || [],
      tax: Number(body.tax || 0),
      notes: body.notes,
      advisorId: auth.userId,
      createdBy: auth.userId,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
