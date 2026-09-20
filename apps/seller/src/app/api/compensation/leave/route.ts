import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createLeaveRequest,
  getLeaveBalance,
  listLeaveRequests,
} from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const year = new Date().getFullYear();
    const [balance, requests] = await Promise.all([
      getLeaveBalance(auth.tenantId, auth.userId, year),
      listLeaveRequests(auth.tenantId, { sellerId: auth.userId, limit: 50 }),
    ]);

    return NextResponse.json({ balance, requests });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[compensation/leave GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const startDate = String(body.startDate || '').trim();
    const endDate = String(body.endDate || '').trim();
    const reason = body.reason ? String(body.reason).trim() : undefined;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    let sellerName: string | undefined;
    try {
      const userDoc = await getFirestore().collection('users').doc(auth.userId).get();
      sellerName = userDoc.data()?.name || userDoc.data()?.displayName;
    } catch {
      /* ignore */
    }

    const leave = await createLeaveRequest({
      tenantId: auth.tenantId,
      sellerId: auth.userId,
      sellerName,
      startDate,
      endDate,
      reason,
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[compensation/leave POST]', error);
    const status = message.includes('disponible') || message.includes('inválido') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
