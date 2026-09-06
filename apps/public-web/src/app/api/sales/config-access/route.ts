import { NextRequest, NextResponse } from 'next/server';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';
import {
  getSalesEmployee,
  listActiveStaffAccessGrants,
  listStaffAccessRequestsForEmployee,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sales/config-access
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySalesEmployeeAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const employee = await getSalesEmployee(auth.salesEmployeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    let activeGrants: Awaited<ReturnType<typeof listActiveStaffAccessGrants>> = [];
    let requests: Awaited<ReturnType<typeof listStaffAccessRequestsForEmployee>> = [];

    try {
      activeGrants = await listActiveStaffAccessGrants(auth.salesEmployeeId);
    } catch (e) {
      console.error('[sales/config-access] grants', e);
    }
    try {
      requests = await listStaffAccessRequestsForEmployee(auth.salesEmployeeId, 20);
    } catch (e) {
      console.error('[sales/config-access] requests', e);
    }

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name, email: employee.email },
      activeGrants,
      activeGrant: activeGrants[0] || null,
      requests,
      hasActiveAccess: activeGrants.length > 0,
    });
  } catch (error: unknown) {
    console.error('[sales/config-access]', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
