import { NextRequest } from 'next/server';
import { getAuth, getSalesEmployeeByAuthUserId } from '@autodealers/core';
import { verifySalesEmployeeSessionToken } from '@/lib/sales-employee-session';

export interface SalesEmployeeAuthContext {
  userId: string;
  role: 'sales_employee';
  salesEmployeeId: string;
}

export async function verifySalesEmployeeAuth(
  request: NextRequest
): Promise<SalesEmployeeAuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('salesEmployeeAuthToken')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    if (!token) return null;

    try {
      const decoded = await getAuth().verifyIdToken(token);
      if (!decoded.uid) return null;
      const employee = await getSalesEmployeeByAuthUserId(decoded.uid);
      if (!employee || employee.status !== 'active') return null;
      return {
        userId: decoded.uid,
        role: 'sales_employee',
        salesEmployeeId: employee.id,
      };
    } catch {
      // session token fallback
    }

    const sessionData = verifySalesEmployeeSessionToken(token);
    if (!sessionData) {
      return null;
    }

    const employee = await getSalesEmployeeByAuthUserId(sessionData.uid);
    if (!employee || employee.status !== 'active' || employee.id !== sessionData.salesEmployeeId) {
      return null;
    }

    return {
      userId: sessionData.uid,
      role: 'sales_employee',
      salesEmployeeId: employee.id,
    };
  } catch {
    return null;
  }
}
