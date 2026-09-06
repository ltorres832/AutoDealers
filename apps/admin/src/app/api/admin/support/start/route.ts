import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  assertAdminCanConfigureAccounts,
  createSupportSession,
  resolveSupportTarget,
} from '@autodealers/core';
import {
  resolveAdvertiserUrl,
  resolveBusinessUrl,
  resolveDealerUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/support/start
 * Solo admin/super_admin (acceso permanente).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminCanConfigureAccounts(auth.userId);

    const body = await request.json().catch(() => ({}));
    const { userId } = await resolveSupportTarget({
      userId: typeof body.userId === 'string' ? body.userId : undefined,
      tenantId: typeof body.tenantId === 'string' ? body.tenantId : undefined,
      advertiserId: typeof body.advertiserId === 'string' ? body.advertiserId : undefined,
    });

    const { session, token, portal } = await createSupportSession({
      adminUserId: auth.userId,
      adminEmail: auth.email || '',
      targetUserId: userId,
      reason: typeof body.reason === 'string' ? body.reason : 'Soporte desde admin',
    });

    const base =
      portal === 'dealer'
        ? resolveDealerUrl()
        : portal === 'seller'
          ? resolveSellerUrl()
          : portal === 'business'
            ? resolveBusinessUrl()
            : resolveAdvertiserUrl();

    const redirectUrl = `${base.replace(/\/$/, '')}/api/auth/support-enter?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      success: true,
      portal,
      redirectUrl,
      accessMode: 'permanent',
      session: {
        id: session.id,
        targetUserId: session.targetUserId,
        targetEmail: session.targetEmail,
        targetName: session.targetName,
        targetTenantId: session.targetTenantId,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error iniciando soporte';
    console.error('[admin/support/start]', error);
    const status = message.includes('Solo admin') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
