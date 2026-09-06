export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getSalesEmployeeDashboardData,
  serializeSalesEmployee,
  updateSalesEmployee,
} from '@autodealers/core';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const dashboard = await getSalesEmployeeDashboardData(params.id);
  if (!dashboard) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const employee = await updateSalesEmployee(params.id, body);
    return NextResponse.json({ employee: serializeSalesEmployee(employee) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
