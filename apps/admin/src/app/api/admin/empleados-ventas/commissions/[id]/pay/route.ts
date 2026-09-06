export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { transferSalesEmployeeCommission } from '@autodealers/core';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const transferId = await transferSalesEmployeeCommission(params.id);
    return NextResponse.json({ success: true, transferId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo pagar la comisión';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
