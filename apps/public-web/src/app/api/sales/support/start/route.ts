import { NextRequest, NextResponse } from 'next/server';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';
import {
  assertSalesEmployeeCanConfigureAccounts,
  createSupportSession,
  getSalesEmployee,
  listSalesEmployeeAccounts,
  resolveSupportTarget,
} from '@autodealers/core';
import {
  resolveBusinessUrl,
  resolveDealerUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sales/support/start
 * Entra solo si hay grant activo para ESA cuenta (tenantId / accountId).
 */
export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const employee = await getSalesEmployee(auth.salesEmployeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : '';

    if (!tenantId && !userId && !accountId) {
      return NextResponse.json({ error: 'Indica la cuenta (tenantId)' }, { status: 400 });
    }

    const myAccounts = await listSalesEmployeeAccounts(auth.salesEmployeeId);
    const account = myAccounts.find(
      (a) =>
        (accountId && a.id === accountId) ||
        (tenantId && a.tenantId === tenantId) ||
        (userId && a.userId === userId)
    );
    if (!account) {
      return NextResponse.json(
        { error: 'Esa cuenta no está asignada a ti' },
        { status: 403 }
      );
    }

    const access = await assertSalesEmployeeCanConfigureAccounts(auth.salesEmployeeId, {
      tenantId: account.tenantId,
      userId: account.userId,
      accountId: account.id,
    });

    const target = await resolveSupportTarget({
      userId: account.userId || userId || undefined,
      tenantId: account.tenantId || tenantId || undefined,
    });

    const { session, token, portal } = await createSupportSession({
      adminUserId: auth.salesEmployeeId,
      adminEmail: employee.email,
      targetUserId: target.userId,
      reason: `Empleado ventas · cuenta ${account.tenantId} · grant ${access.grant.id}`,
    });

    if (portal === 'advertiser') {
      return NextResponse.json(
        { error: 'Portal anunciante no disponible para empleados de ventas' },
        { status: 400 }
      );
    }

    const base =
      portal === 'dealer'
        ? resolveDealerUrl()
        : portal === 'seller'
          ? resolveSellerUrl()
          : resolveBusinessUrl();

    const redirectUrl = `${base.replace(/\/$/, '')}/api/auth/support-enter?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      success: true,
      portal,
      redirectUrl,
      grantExpiresAt: access.grant.expiresAt,
      targetAccount: {
        tenantId: account.tenantId,
        accountId: account.id,
        label: access.grant.targetAccountLabel || account.companyName || account.name,
      },
      session: {
        id: session.id,
        targetName: session.targetName,
        targetEmail: session.targetEmail,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    const status = message.includes('No tienes acceso') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
