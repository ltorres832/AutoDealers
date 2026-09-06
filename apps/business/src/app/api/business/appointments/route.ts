import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import {
  createAppointment,
  createLead,
  getAppointments,
  getLeads,
  updateAppointment,
  updateAppointmentStatus,
} from '@autodealers/crm';

const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
const APPOINTMENT_TYPES = ['consultation', 'service', 'maintenance', 'inspection', 'other'] as const;

function serializeAppointment(item: any, lead?: any) {
  return {
    id: item.id,
    type: item.type || 'service',
    status: item.status || 'scheduled',
    scheduledAt: item.scheduledAt instanceof Date ? item.scheduledAt.toISOString() : item.scheduledAt,
    duration: item.duration || 60,
    notes: item.notes || '',
    location: item.location || '',
    serviceType: item.serviceType || '',
    leadId: item.leadId || '',
    customerName: item.customerName || lead?.contact?.name || lead?.name || '',
    customerPhone: item.customerPhone || lead?.contact?.phone || lead?.phone || '',
    customerEmail: lead?.contact?.email || lead?.email || '',
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const [appointments, leads] = await Promise.all([getAppointments(auth.tenantId), getLeads(auth.tenantId)]);
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  return NextResponse.json({
    appointments: appointments.map((item) => serializeAppointment(item, leadsById.get(item.leadId))),
    leads: leads.map((lead) => ({
      id: lead.id,
      name: lead.contact?.name,
      phone: lead.contact?.phone,
      email: lead.contact?.email,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!customerName || !customerPhone) {
    return NextResponse.json({ error: 'Nombre y teléfono son requeridos' }, { status: 400 });
  }
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Fecha y hora son requeridas' }, { status: 400 });
  }

  let leadId = String(body.leadId || '').trim();
  if (!leadId) {
    const lead = await createLead(
      auth.tenantId,
      'manual',
      {
        name: customerName,
        phone: customerPhone,
        email: customerEmail || undefined,
        preferredChannel: customerEmail ? 'email' : 'phone',
      },
      String(body.notes || ''),
      {
        assignedTo: auth.userId,
        createdBy: auth.userId,
        vehicleInterest: body.vehicleLabel ? String(body.vehicleLabel) : undefined,
        initialStatus: 'appointment',
      }
    );
    leadId = lead.id;
  }

  const type = APPOINTMENT_TYPES.includes(body.type) ? body.type : 'service';
  try {
    const appointment = await createAppointment({
      tenantId: auth.tenantId,
      leadId,
      assignedTo: auth.userId,
      vehicleIds: [],
      type,
      scheduledAt,
      duration: Math.max(15, Number(body.duration) || 60),
      status: 'scheduled',
      location: body.location ? String(body.location) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      customerName,
      customerPhone,
      serviceType: body.serviceType ? String(body.serviceType) : undefined,
    });
    return NextResponse.json({ appointment: serializeAppointment(appointment) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo crear la cita' }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Falta el id de la cita' }, { status: 400 });

  if (body.status && APPOINTMENT_STATUSES.includes(body.status)) {
    await updateAppointmentStatus(auth.tenantId, id, body.status);
  }

  const patch: Record<string, unknown> = {};
  if (body.scheduledAt) patch.scheduledAt = new Date(body.scheduledAt);
  if (body.duration != null) patch.duration = Math.max(15, Number(body.duration) || 60);
  if (body.notes !== undefined) patch.notes = String(body.notes || '');
  if (body.location !== undefined) patch.location = String(body.location || '');
  if (body.serviceType !== undefined) patch.serviceType = String(body.serviceType || '');
  if (body.type && APPOINTMENT_TYPES.includes(body.type)) patch.type = body.type;
  if (Object.keys(patch).length) {
    await updateAppointment(auth.tenantId, id, patch as any);
  }

  return NextResponse.json({ ok: true });
}
