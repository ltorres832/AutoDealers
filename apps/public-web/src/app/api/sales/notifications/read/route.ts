export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { markSalesEmployeeNotificationsRead } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await markSalesEmployeeNotificationsRead(auth.salesEmployeeId);
  return NextResponse.json({ success: true });
}
