export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { linkExistingSalesEmployeeAccount } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const result = await linkExistingSalesEmployeeAccount({
      employeeId: auth.salesEmployeeId,
      role: String(body.role || ''),
      email: String(body.email || ''),
      tenantId: String(body.tenantId || ''),
      companyName: String(body.companyName || ''),
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: 'Cuenta vinculada. Ya puedes generar el link de membresía y crear anuncios para este cliente.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo vincular la cuenta';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
