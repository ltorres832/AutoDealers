export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSalesEmployeeOrientationAppointment, listSalesEmployeeAccounts } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const accounts = await listSalesEmployeeAccounts(auth.salesEmployeeId);
    const account = accounts.find((item) => item.id === String(body.accountId || ''));
    const id = await createSalesEmployeeOrientationAppointment({
      employeeId: auth.salesEmployeeId,
      accountId: account?.id,
      tenantId: account?.tenantId || String(body.tenantId || ''),
      visitId: String(body.visitId || ''),
      contactName: String(body.contactName || ''),
      contactPhone: String(body.contactPhone || ''),
      contactEmail: String(body.contactEmail || ''),
      companyName: String(body.companyName || ''),
      prospectRole: String(body.prospectRole || ''),
      prospectRelation: String(body.prospectRelation || ''),
      scheduledAt: String(body.scheduledAt || ''),
      notes: String(body.notes || ''),
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la cita';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
