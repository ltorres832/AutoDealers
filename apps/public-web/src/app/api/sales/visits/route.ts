export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSalesEmployeeVisit } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const id = await createSalesEmployeeVisit({
      employeeId: auth.salesEmployeeId,
      accountId: String(body.accountId || ''),
      tenantId: String(body.tenantId || ''),
      contactName: String(body.contactName || ''),
      contactPhone: String(body.contactPhone || ''),
      contactEmail: String(body.contactEmail || ''),
      companyName: String(body.companyName || ''),
      prospectRole: String(body.prospectRole || ''),
      prospectRelation: body.prospectRelation,
      notes: String(body.notes || ''),
      visitedAt: String(body.visitedAt || ''),
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar la visita';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
