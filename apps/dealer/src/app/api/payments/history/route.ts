import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, billingTenantId } from '@/lib/auth';
import {
  listTenantPaymentHistory,
  type PaymentHistoryFilter,
} from '@autodealers/billing/payment-history';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<PaymentHistoryFilter>([
  'all',
  'membership',
  'promotion',
  'banner',
  'featured',
]);

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const typeParam = request.nextUrl.searchParams.get('type') || 'all';
    const type = VALID_TYPES.has(typeParam as PaymentHistoryFilter)
      ? (typeParam as PaymentHistoryFilter)
      : 'all';

    const payments = await listTenantPaymentHistory({
      marketplaceTenantId: auth.tenantId,
      billingTenantId: billingTenantId(auth) || auth.tenantId,
      type,
    });

    return NextResponse.json({ payments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
