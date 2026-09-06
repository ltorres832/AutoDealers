export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { getSalesEmployeeIdForTenant, requestSalesEmployeeAppointmentByClient } from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) {
    return NextResponse.json({ assigned: false }, { status: 401 });
  }
  const employeeId = await getSalesEmployeeIdForTenant(auth.tenantId);
  return NextResponse.json({ assigned: Boolean(employeeId) });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId || !auth.userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = await requestSalesEmployeeAppointmentByClient({
      tenantId: auth.tenantId,
      userId: auth.userId,
      kind: 'setup',
      scheduledAt: String(body.scheduledAt || ''),
      notes: String(body.notes || ''),
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
