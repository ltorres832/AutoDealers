import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  assertAdminCanConfigureAccounts,
  createStaffAccessGrant,
  getAdminUser,
  hasPermanentStaffConfigAccess,
  listSalesEmployeeAccounts,
  listSalesEmployees,
  listStaffAccessGrants,
  listStaffAccessRequests,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/staff-access
 * Admin: grants, solicitudes y lista de empleados de ventas.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const me = await getAdminUser(auth.userId);
    // Si no hay doc admin_users, igual permitir a role admin de sesión
    const canManage =
      hasPermanentStaffConfigAccess(me) ||
      auth.role === 'admin';

    if (!canManage) {
      return NextResponse.json(
        { error: 'Solo admin/super_admin gestionan acceso de empleados' },
        { status: 403 }
      );
    }

    let grants: Awaited<ReturnType<typeof listStaffAccessGrants>> = [];
    let requests: Awaited<ReturnType<typeof listStaffAccessRequests>> = [];
    let employees: Awaited<ReturnType<typeof listSalesEmployees>> = [];
    let accounts: Awaited<ReturnType<typeof listSalesEmployeeAccounts>> = [];

    try {
      [grants, requests, employees, accounts] = await Promise.all([
        listStaffAccessGrants(100),
        listStaffAccessRequests(undefined, 100),
        listSalesEmployees(),
        listSalesEmployeeAccounts(),
      ]);
    } catch (e) {
      console.error('[admin/staff-access GET] lists', e);
    }

    return NextResponse.json({
      me: {
        userId: auth.userId,
        email: auth.email,
        name: me?.name || auth.email || '',
        role: me?.role || 'admin',
        permanentAccess: true,
      },
      grants,
      requests,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        status: e.status,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        tenantId: a.tenantId,
        userId: a.userId,
        name: a.name,
        companyName: a.companyName,
        email: a.email,
        role: a.role,
      })),
      canManage: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff-access
 * Admin otorga acceso temporal a un empleado de ventas.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminCanConfigureAccounts(auth.userId).catch(async () => {
      // Fallback: sesión admin sin doc admin_users
      if (auth.role !== 'admin') throw new Error('Solo admin/super_admin');
    });

    const body = await request.json().catch(() => ({}));
    const salesEmployeeId = String(body.salesEmployeeId || body.employeeUserId || '').trim();
    if (!salesEmployeeId) {
      return NextResponse.json({ error: 'salesEmployeeId requerido' }, { status: 400 });
    }

    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: 'startsAt inválido' }, { status: 400 });
    }

    const targetTenantId = String(body.targetTenantId || '').trim();
    if (!targetTenantId) {
      return NextResponse.json(
        { error: 'targetTenantId requerido (cuenta específica)' },
        { status: 400 }
      );
    }

    const grant = await createStaffAccessGrant({
      salesEmployeeId,
      grantedByAdminId: auth.userId,
      grantedByEmail: auth.email || '',
      startsAt,
      durationMinutes: Number(body.durationMinutes || 60),
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      requestId: typeof body.requestId === 'string' ? body.requestId : undefined,
      targetTenantId,
      targetUserId: typeof body.targetUserId === 'string' ? body.targetUserId : undefined,
      targetAccountId: typeof body.targetAccountId === 'string' ? body.targetAccountId : undefined,
      targetAccountLabel:
        typeof body.targetAccountLabel === 'string' ? body.targetAccountLabel : undefined,
    });

    return NextResponse.json({ success: true, grant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
