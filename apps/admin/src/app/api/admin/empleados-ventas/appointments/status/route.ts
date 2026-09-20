export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { updateSalesEmployeeAppointmentStatus } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const status = String(body.status || '');
    if (status !== 'completed' && status !== 'cancelled' && status !== 'scheduled') {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }
    await updateSalesEmployeeAppointmentStatus({
      appointmentId: String(body.appointmentId || ''),
      status: status as 'completed' | 'cancelled' | 'scheduled',
      actor: 'admin',
      adminUserId: auth.userId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
