import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { listLeaveRequests, reviewLeaveRequest } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const sellerId = searchParams.get('sellerId') || undefined;
    const requests = await listLeaveRequests(auth.tenantId, {
      status,
      sellerId,
      limit: 200,
    });
    return NextResponse.json({ requests });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[dealer compensation/leave GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const leaveId = String(body.leaveId || '').trim();
    const status = body.status as 'approved' | 'rejected';
    if (!leaveId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'leaveId y status inválidos' }, { status: 400 });
    }

    await reviewLeaveRequest(
      auth.tenantId,
      leaveId,
      status,
      auth.userId,
      body.reviewerNote ? String(body.reviewerNote) : undefined
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[dealer compensation/leave PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
