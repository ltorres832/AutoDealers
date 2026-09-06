export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSalesEmployeeDashboardData, getSalesEmployeeConnectStatus } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function GET(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const dashboard = await getSalesEmployeeDashboardData(auth.salesEmployeeId);
  if (!dashboard) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  let stripeConnect;
  try {
    stripeConnect = await getSalesEmployeeConnectStatus(auth.salesEmployeeId);
  } catch {
    stripeConnect = {
      accountId: dashboard.employee.stripeConnectAccountId,
      onboardingComplete: dashboard.employee.stripeConnectOnboardingComplete,
      payoutsEnabled: dashboard.employee.stripeConnectPayoutsEnabled,
      chargesEnabled: false,
      detailsSubmitted: dashboard.employee.stripeConnectOnboardingComplete,
      requiresAction: !dashboard.employee.stripeConnectPayoutsEnabled,
    };
  }

  return NextResponse.json({ ...dashboard, stripeConnect });
}
