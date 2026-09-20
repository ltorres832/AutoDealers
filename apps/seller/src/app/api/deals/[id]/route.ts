import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getDeal,
  updateDeal,
  cancelDeal,
  convertDealToSale,
  computeDealTotal,
} from '@autodealers/crm';
import { dispatchTenantWebhook, resolveDepositConnectContext } from '@autodealers/core';

export const dynamic = 'force-dynamic';

async function assertSellerOwnsDeal(
  auth: { userId: string; tenantId: string; dealerId?: string; billingMode?: string; role: string },
  dealId: string
) {
  const ctx = await resolveDepositConnectContext({
    role: auth.role,
    tenantId: auth.tenantId,
    userId: auth.userId,
    dealerId: auth.dealerId,
    billingMode: auth.billingMode,
  });
  const deal = await getDeal(ctx.dealTenantId, dealId);
  if (!deal || deal.sellerId !== auth.userId) {
    return { error: NextResponse.json({ error: 'No encontrado' }, { status: 404 }) };
  }
  return { deal, ctx };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const result = await assertSellerOwnsDeal(auth, id);
    if ('error' in result && result.error) return result.error;
    return NextResponse.json({ deal: result.deal, connect: result.ctx });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const owned = await assertSellerOwnsDeal(auth, id);
    if ('error' in owned && owned.error) return owned.error;
    const dealTenantId = owned.ctx!.dealTenantId;

    const body = await request.json();
    const action = String(body.action || '').trim();

    if (action === 'cancel') {
      const deal = await cancelDeal(dealTenantId, id, body.releaseVehicle !== false);
      await dispatchTenantWebhook(dealTenantId, 'deal.updated', {
        dealId: deal.id,
        status: deal.status,
      });
      return NextResponse.json({ deal });
    }

    if (action === 'convert_sale') {
      const result = await convertDealToSale(dealTenantId, id, auth.userId);
      await dispatchTenantWebhook(dealTenantId, 'sale.completed', {
        saleId: result.sale.id,
        dealId: result.deal.id,
      });
      return NextResponse.json(result);
    }

    const patch: any = {};
    const numeric = [
      'vehiclePrice',
      'tradeInValue',
      'rebate',
      'tablilla',
      'tax',
      'insurance',
      'accessories',
      'warranty',
      'servicePackage',
      'fees',
      'other',
      'depositAmount',
      'total',
    ];
    for (const k of numeric) {
      if (body[k] !== undefined) patch[k] = Number(body[k]);
    }
    if (body.status) patch.status = body.status;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.buyer) patch.buyer = body.buyer;
    if (patch.total == null && Object.keys(patch).some((k) => numeric.includes(k))) {
      patch.total = computeDealTotal({ ...owned.deal!, ...patch });
    }

    const deal = await updateDeal(dealTenantId, id, patch);
    return NextResponse.json({ deal });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[seller deals PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
