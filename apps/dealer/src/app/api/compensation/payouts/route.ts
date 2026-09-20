import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  createPayout,
  getCompensationSettings,
  listPayouts,
  listSellerSales,
  computeSaleCompensation,
  updatePayoutStatus,
} from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId') || undefined;
    const payouts = await listPayouts(auth.tenantId, { sellerId, limit: 200 });
    return NextResponse.json({ payouts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[dealer compensation/payouts GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sellerId = String(body.sellerId || '').trim();
    const periodStart = String(body.periodStart || '').trim();
    const periodEnd = String(body.periodEnd || '').trim();
    const markPaid = body.markPaid === true;

    if (!sellerId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'sellerId, periodStart y periodEnd son requeridos' },
        { status: 400 }
      );
    }

    let sellerName: string | undefined;
    try {
      const userDoc = await getFirestore().collection('users').doc(sellerId).get();
      sellerName = userDoc.data()?.name || userDoc.data()?.displayName;
    } catch {
      /* ignore */
    }

    const settings = await getCompensationSettings(auth.tenantId);
    const sales = await listSellerSales(auth.tenantId, sellerId, {
      status: 'completed',
      limit: 500,
    });

    const inPeriod = sales.filter((s) => {
      const d = s.completedAt || s.createdAt;
      const iso =
        d instanceof Date
          ? d.toISOString().slice(0, 10)
          : typeof (d as any)?.toDate === 'function'
            ? (d as any).toDate().toISOString().slice(0, 10)
            : String(d || '').slice(0, 10);
      return iso >= periodStart && iso <= periodEnd;
    });

    const lineMap: Record<string, { product: string; label: string; amount: number }> = {};
    const saleIds: string[] = [];
    for (const sale of inPeriod) {
      saleIds.push(sale.id);
      const calc = computeSaleCompensation(sale, settings.rates);
      for (const line of calc.lines) {
        const prev = lineMap[line.product];
        if (prev) prev.amount += line.amount;
        else lineMap[line.product] = { ...line };
      }
    }

    const lines = Object.values(lineMap).map((l) => ({
      ...l,
      amount: Math.round(l.amount * 100) / 100,
    }));
    const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

    if (body.totalAmount != null && Number.isFinite(Number(body.totalAmount))) {
      // allow manual override amount with single line
    }

    const payout = await createPayout({
      tenantId: auth.tenantId,
      sellerId,
      sellerName,
      periodStart,
      periodEnd,
      lines:
        lines.length > 0
          ? lines
          : [
              {
                product: 'manual',
                label: 'Liquidación manual',
                amount: Number(body.totalAmount || 0),
              },
            ],
      totalAmount:
        lines.length > 0 ? totalAmount : Math.round(Number(body.totalAmount || 0) * 100) / 100,
      currency: 'USD',
      notes: body.notes ? String(body.notes) : undefined,
      saleIds,
      createdBy: auth.userId,
      status: markPaid ? 'paid' : 'pending',
    });

    return NextResponse.json({ payout }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[dealer compensation/payouts POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payoutId = String(body.payoutId || '').trim();
    const status = body.status as 'pending' | 'paid' | 'cancelled';
    if (!payoutId || !['pending', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'payoutId y status inválidos' }, { status: 400 });
    }

    await updatePayoutStatus(auth.tenantId, payoutId, status);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[dealer compensation/payouts PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
