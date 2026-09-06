import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  approveStaffAccessRequest,
  denyStaffAccessRequest,
  getAdminUser,
  hasPermanentStaffConfigAccess,
  revokeStaffAccessGrant,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/staff-access/[id]
 * Body: { action: 'approve' | 'deny' | 'revoke', ... }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const me = await getAdminUser(auth.userId);
    if (!hasPermanentStaffConfigAccess(me) && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admin/super_admin' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'revoke') {
      await revokeStaffAccessGrant(id, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'deny') {
      await denyStaffAccessRequest({
        requestId: id,
        deniedByAdminId: auth.userId,
        denyReason: typeof body.denyReason === 'string' ? body.denyReason : undefined,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
      const result = await approveStaffAccessRequest({
        requestId: id,
        approvedByAdminId: auth.userId,
        approvedByEmail: auth.email || '',
        startsAt,
        durationMinutes: Number(body.durationMinutes || 60),
        targetTenantId:
          typeof body.targetTenantId === 'string' ? body.targetTenantId : undefined,
        targetUserId: typeof body.targetUserId === 'string' ? body.targetUserId : undefined,
        targetAccountId:
          typeof body.targetAccountId === 'string' ? body.targetAccountId : undefined,
        targetAccountLabel:
          typeof body.targetAccountLabel === 'string' ? body.targetAccountLabel : undefined,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
