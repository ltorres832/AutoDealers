export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSalesEmployeeAppointment } from '@autodealers/core';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = await createSalesEmployeeAppointment({
      employeeId: String(body.employeeId || ''),
      accountId: String(body.accountId || ''),
      tenantId: String(body.tenantId || ''),
      visitId: String(body.visitId || ''),
      contactName: String(body.contactName || ''),
      contactPhone: String(body.contactPhone || ''),
      contactEmail: String(body.contactEmail || ''),
      companyName: String(body.companyName || ''),
      prospectRole: String(body.prospectRole || ''),
      prospectRelation: String(body.prospectRelation || ''),
      kind: body.kind === 'setup' ? 'setup' : 'orientation',
      scheduledAt: String(body.scheduledAt || ''),
      notes: String(body.notes || ''),
      requestedBy: 'admin',
      createdByAdminId: auth.userId,
      grantAccessDurationMinutes:
        body.grantAccess === true ? Number(body.grantAccessDurationMinutes || 120) : undefined,
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
