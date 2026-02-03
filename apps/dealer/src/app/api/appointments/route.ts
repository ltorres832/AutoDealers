import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAppointments, createAppointment } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointments = await getAppointments(auth.tenantId);

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
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const appointment = await createAppointment({
      tenantId: auth.tenantId,
      leadId: body.leadId,
      assignedTo: body.assignedTo || auth.userId,
      vehicleIds: body.vehicleIds || [],
      type: body.type,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration || 60,
      location: body.location,
      status: 'scheduled',
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





