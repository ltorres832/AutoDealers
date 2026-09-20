export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import {
  getSellerLimitsSummary,
  setSellerAssignedLimits,
  parseAssignedSellerLimits,
  getDealerLimitsPoolSummary,
  SELLER_ASSIGNABLE_LIMIT_KEYS,
  sellerLimitLabel,
} from '@autodealers/core';

async function assertDealerOwnsSeller(
  dealerTenantId: string,
  sellerId: string
): Promise<{ ok: true; sellerTenantId?: string } | { ok: false; status: number; error: string }> {
  const db = getFirestore();
  const sellerDoc = await db.collection('users').doc(sellerId).get();
  if (!sellerDoc.exists) {
    return { ok: false, status: 404, error: 'Vendedor no encontrado' };
  }
  const data = sellerDoc.data() || {};
  if (data.dealerId !== dealerTenantId && data.tenantId !== dealerTenantId) {
    return { ok: false, status: 403, error: 'No tienes acceso a este vendedor' };
  }
  return {
    ok: true,
    sellerTenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sellerId } = await params;
    const access = await assertDealerOwnsSeller(auth.tenantId, sellerId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const summary = await getSellerLimitsSummary(
      auth.tenantId,
      sellerId,
      access.sellerTenantId
    );
    const pool = await getDealerLimitsPoolSummary(auth.tenantId);

    const items = SELLER_ASSIGNABLE_LIMIT_KEYS.map((key) => ({
      key,
      label: sellerLimitLabel(key),
      assigned: summary.assigned[key] ?? null,
      usage: summary.usage[key],
      planCap: summary.planCaps[key] ?? null,
      effective: summary.effective[key] ?? null,
      poolRemaining: pool.remainingPool[key] ?? null,
    }));

    return NextResponse.json({ limits: items, pool });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[sellers/limits GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sellerId } = await params;
    const access = await assertDealerOwnsSeller(auth.tenantId, sellerId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const patch = (body?.limits ?? body) as Record<string, unknown>;

    const result = await setSellerAssignedLimits({
      dealerTenantId: auth.tenantId,
      sellerUserId: sellerId,
      limits: patch,
      updatedBy: auth.userId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const summary = await getSellerLimitsSummary(
      auth.tenantId,
      sellerId,
      access.sellerTenantId
    );

    return NextResponse.json({
      success: true,
      assignedLimits: result.normalized,
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[sellers/limits PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
