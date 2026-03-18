export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAppointmentsBySeller,
  createAppointment,
} from '@autodealers/crm';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const appointments = sellerId
      ? await getAppointmentsBySeller(
          auth.tenantId,
          sellerId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        )
      : [];

    return NextResponse.json({ appointments });
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
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, assignedTo, vehicleIds, type, scheduledAt, duration, location } = body;

    if (!leadId || !assignedTo || !scheduledAt || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const appointment = await createAppointment({
      tenantId: auth.tenantId,
      leadId,
      assignedTo,
      vehicleIds: vehicleIds || [],
      type,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      location,
      status: 'scheduled',
    });

    // Crear notificación para el vendedor asignado
    try {
      const { createNotification } = await import('@autodealers/core');
      const { getLeadById } = await import('@autodealers/crm');
      const lead = await getLeadById(auth.tenantId, leadId);
      
      await createNotification({
        tenantId: auth.tenantId,
        userId: assignedTo,
        type: 'appointment_created',
        title: 'Nueva cita programada',
        message: `Tienes una nueva ${type === 'consultation' ? 'consulta' : type === 'test_drive' ? 'prueba de manejo' : 'entrega'} con ${lead?.contact?.name || 'cliente'}`,
        channels: ['system'],
        metadata: {
          appointmentId: appointment.id,
          leadId,
          route: `/appointments`,
        },
      });
    } catch (notifError) {
      console.warn('No se pudo crear notificación:', notifError);
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}





