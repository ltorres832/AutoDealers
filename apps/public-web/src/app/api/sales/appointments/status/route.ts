export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { updateSalesEmployeeAppointmentStatus } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function PATCH(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const status = String(body.status || '');
    if (status !== 'completed' && status !== 'cancelled') {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }
    await updateSalesEmployeeAppointmentStatus({
      appointmentId: String(body.appointmentId || ''),
      employeeId: auth.salesEmployeeId,
      status,
      actor: 'employee',
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
