import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getAppointmentById, updateAppointment, createRepairOrder } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const appointment = await getAppointmentById(auth.tenantId, id);
  if (!appointment) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  return NextResponse.json({ appointment });
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
    const current = await getAppointmentById(auth.tenantId, id);
    if (!current) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    if (body.action === 'to_ro') {
      const order = await createRepairOrder({
        tenantId: auth.tenantId,
        status: 'intake',
        customerName: String(body.customerName || current.customerName || 'Cliente'),
        customerPhone: body.customerPhone || current.customerPhone,
        leadId: current.leadId || undefined,
        vehicleId: current.vehicleIds?.[0],
        vehicleLabel: body.vehicleLabel,
        appointmentId: current.id,
        complaints: body.complaints
          ? String(body.complaints)
              .split('\n')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [current.serviceType || current.type || 'Servicio'].filter(Boolean),
        labor: [],
        parts: [],
        tax: 0,
        notes: current.notes,
        advisorId: current.advisorId || auth.userId,
        technicianId: current.technicianId,
        createdBy: auth.userId,
      });
      const appointment = await updateAppointment(auth.tenantId, id, { repairOrderId: order.id });
      return NextResponse.json({ appointment, order });
    }

    const patch: Record<string, unknown> = {};
    for (const k of [
      'status',
      'type',
      'notes',
      'location',
      'assignedTo',
      'duration',
      'leadId',
      'vehicleIds',
      'customerName',
      'customerPhone',
      'serviceType',
      'technicianId',
      'advisorId',
      'reminderRequested',
    ]) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    if (body.scheduledAt) patch.scheduledAt = new Date(body.scheduledAt);
    const appointment = await updateAppointment(auth.tenantId, id, patch as any);
    return NextResponse.json({ appointment });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
