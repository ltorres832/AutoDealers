export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listAffiliateCommissions, getAffiliatePartner, formatAffiliatePayoutProfileSummary } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'approved' | 'paid' | 'cancelled' | null;
    const affiliateId = searchParams.get('affiliateId') || undefined;

    const commissions = await listAffiliateCommissions({
      status: status || undefined,
      affiliateId,
      limit: 300,
    });

    const affiliateIds = [...new Set(commissions.map((c) => c.affiliateId))];
    const affiliateMap = new Map<string, Awaited<ReturnType<typeof getAffiliatePartner>>>();
    await Promise.all(
      affiliateIds.map(async (id) => {
        affiliateMap.set(id, await getAffiliatePartner(id));
      })
    );

    const serialized = commissions.map((c) => {
      const affiliate = affiliateMap.get(c.affiliateId);
      return {
        ...c,
        approvedAt: c.approvedAt?.toDate?.()?.toISOString?.() ?? null,
        paidAt: c.paidAt?.toDate?.()?.toISOString?.() ?? null,
        createdAt: c.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: c.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        affiliatePayoutConfigured: affiliate?.stripeConnectPayoutsEnabled === true,
        affiliateConnectAccountId: affiliate?.stripeConnectAccountId ?? null,
        affiliateConnectPayoutsEnabled: affiliate?.stripeConnectPayoutsEnabled === true,
        affiliatePayoutSummary: affiliate?.stripeConnectPayoutsEnabled
          ? 'Stripe Connect'
          : affiliate?.stripeConnectAccountId
            ? 'Stripe Connect (onboarding pendiente)'
            : formatAffiliatePayoutProfileSummary(affiliate?.payoutProfile),
        affiliatePayoutProfile: affiliate?.payoutProfile ?? null,
        payoutStatus: c.payoutStatus ?? null,
        stripeTransferId: c.stripeTransferId ?? null,
        payoutError: c.payoutError ?? null,
        eligibleAt: c.eligibleAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    const stats = {
      total: serialized.length,
      approved: serialized.filter((c) => c.status === 'approved').length,
      paid: serialized.filter((c) => c.status === 'paid').length,
      cancelled: serialized.filter((c) => c.status === 'cancelled').length,
      pendingAmount: serialized
        .filter((c) => c.status === 'approved')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
      paidAmount: serialized
        .filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    };

    return NextResponse.json({ commissions: serialized, stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
