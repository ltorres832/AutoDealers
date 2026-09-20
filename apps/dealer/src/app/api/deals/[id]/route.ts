import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getDeal,
  updateDeal,
  cancelDeal,
  convertDealToSale,
  handoffDealToFi,
  computeDealTotal,
} from '@autodealers/crm';
import { dispatchTenantWebhook } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const deal = await getDeal(auth.tenantId, id);
    if (!deal) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json({ deal });
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
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const action = String(body.action || '').trim();

    if (action === 'cancel') {
      const deal = await cancelDeal(auth.tenantId, id, body.releaseVehicle !== false);
      await dispatchTenantWebhook(auth.tenantId, 'deal.updated', {
        dealId: deal.id,
        status: deal.status,
      });
      return NextResponse.json({ deal });
    }

    if (action === 'convert_sale') {
      const result = await convertDealToSale(auth.tenantId, id, auth.userId);
      await dispatchTenantWebhook(auth.tenantId, 'sale.completed', {
        saleId: result.sale.id,
        dealId: result.deal.id,
        status: result.sale.status,
      });
      return NextResponse.json(result);
    }

    if (action === 'fi_handoff') {
      const fiRequestId = String(body.fiRequestId || '').trim();
      if (!fiRequestId) {
        return NextResponse.json({ error: 'fiRequestId requerido' }, { status: 400 });
      }
      const deal = await handoffDealToFi(auth.tenantId, id, fiRequestId);
      return NextResponse.json({ deal });
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
    if (body.sellerId !== undefined) patch.sellerId = body.sellerId;
    if (body.buyer) patch.buyer = body.buyer;
    if (body.expiresAt !== undefined) {
      patch.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }
    if (patch.total == null && Object.keys(patch).some((k) => numeric.includes(k))) {
      const current = await getDeal(auth.tenantId, id);
      if (current) patch.total = computeDealTotal({ ...current, ...patch });
    }

    const deal = await updateDeal(auth.tenantId, id, patch);
    await dispatchTenantWebhook(auth.tenantId, 'deal.updated', {
      dealId: deal.id,
      status: deal.status,
      total: deal.total,
    });
    return NextResponse.json({ deal });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[deals PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
