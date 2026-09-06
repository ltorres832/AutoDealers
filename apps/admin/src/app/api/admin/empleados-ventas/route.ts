export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createSalesEmployee,
  getSalesEmployeePortalUrl,
  listSalesEmployees,
  serializeSalesEmployee,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const employees = await listSalesEmployees();
  return NextResponse.json({
    employees: employees.map(serializeSalesEmployee),
    portalUrl: getSalesEmployeePortalUrl(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const employee = await createSalesEmployee({
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password,
    });
    return NextResponse.json({
      success: true,
      employee: serializeSalesEmployee(employee),
      temporaryPassword: employee.temporaryPassword,
      portalUrl: getSalesEmployeePortalUrl(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
