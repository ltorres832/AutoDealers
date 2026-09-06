export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSalesEmployeeConnectOnboardingLink } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const result = await createSalesEmployeeConnectOnboardingLink(auth.salesEmployeeId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar Stripe';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
