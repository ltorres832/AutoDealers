import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAppointmentsBySeller, createAppointment } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todas las citas del vendedor
    const appointments = await getAppointmentsBySeller(auth.tenantId, auth.userId);

    return NextResponse.json({
      appointments: appointments.map((apt) => ({
        ...apt,
        scheduledAt: apt.scheduledAt.toISOString(),
        createdAt: apt.createdAt.toISOString(),
        updatedAt: apt.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validar campos requeridos
    if (!body.leadId) {
      return NextResponse.json({ error: 'El lead es requerido' }, { status: 400 });
    }

    if (!body.scheduledAt) {
      return NextResponse.json({ error: 'La fecha y hora son requeridas' }, { status: 400 });
    }

    if (!body.type) {
      return NextResponse.json({ error: 'El tipo de cita es requerido' }, { status: 400 });
    }

    // Crear la cita asignada al vendedor actual
    const appointment = await createAppointment({
      tenantId: auth.tenantId,
      leadId: body.leadId,
      assignedTo: auth.userId, // El vendedor actual
      vehicleIds: body.vehicleIds || [],
      type: body.type,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration || 60,
      location: body.location,
      notes: body.notes,
      status: 'scheduled' as const,
    });

    return NextResponse.json({
      appointment: {
        ...appointment,
        scheduledAt: appointment.scheduledAt.toISOString(),
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}



