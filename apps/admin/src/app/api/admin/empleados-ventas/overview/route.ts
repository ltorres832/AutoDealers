export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  listSalesEmployeeAccounts,
  listSalesEmployeeAppointments,
  listSalesEmployeeCommissions,
  listSalesEmployeePaymentLinks,
  listSalesEmployeeVisits,
  listSalesEmployees,
  serializeSalesEmployee,
  toIso,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [employees, accounts, commissions, visits, appointments, links] = await Promise.all([
    listSalesEmployees(),
    listSalesEmployeeAccounts(),
    listSalesEmployeeCommissions(),
    listSalesEmployeeVisits(),
    listSalesEmployeeAppointments(),
    listSalesEmployeePaymentLinks(),
  ]);

  return NextResponse.json({
    employees: employees.map(serializeSalesEmployee),
    accounts: accounts.map((item) => ({ ...item, createdAt: toIso(item.createdAt) })),
    commissions: commissions.map((item) => ({
      ...item,
      eligibleAt: toIso(item.eligibleAt),
      activatedAt: toIso(item.activatedAt),
      paidAt: toIso(item.paidAt),
      createdAt: toIso(item.createdAt),
    })),
    visits,
    appointments,
    paymentLinks: links,
  });
}
