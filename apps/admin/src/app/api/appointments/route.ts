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

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}





