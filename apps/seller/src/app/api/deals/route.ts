import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createDeal, listDeals, computeDealTotal } from '@autodealers/crm';
import { dispatchTenantWebhook, resolveDepositConnectContext } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await resolveDepositConnectContext({
      role: auth.role,
      tenantId: auth.tenantId,
      userId: auth.userId,
      dealerId: auth.dealerId,
      billingMode: auth.billingMode,
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    let deals = await listDeals(ctx.dealTenantId, {
      status,
      limit: 100,
    });
    // Solo los deals del vendedor
    deals = deals.filter((d) => d.sellerId === auth.userId);

    return NextResponse.json({ deals, connect: ctx });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[seller deals GET]', error);
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
    const ctx = await resolveDepositConnectContext({
      role: auth.role,
      tenantId: auth.tenantId,
      userId: auth.userId,
      dealerId: auth.dealerId,
      billingMode: auth.billingMode,
      preferredConnectTenantId: body.connectTenantId,
    });

    const vehicleId = String(body.vehicleId || '').trim();
    const buyerName = String(body.buyer?.fullName || body.buyerName || '').trim();
    if (!vehicleId || !buyerName) {
      return NextResponse.json(
        { error: 'vehicleId y buyer.fullName son requeridos' },
        { status: 400 }
      );
    }

    const payload = {
      tenantId: ctx.dealTenantId,
      leadId: body.leadId ? String(body.leadId) : undefined,
      vehicleId,
      sellerId: auth.userId,
      buyer: {
        fullName: buyerName,
        email: body.buyer?.email || body.buyerEmail || undefined,
        phone: body.buyer?.phone || body.buyerPhone || undefined,
      },
      vehiclePrice: Number(body.vehiclePrice || 0),
      tradeInValue: body.tradeInValue != null ? Number(body.tradeInValue) : undefined,
      rebate: body.rebate != null ? Number(body.rebate) : undefined,
      tablilla: body.tablilla != null ? Number(body.tablilla) : undefined,
      tax: body.tax != null ? Number(body.tax) : undefined,
      insurance: body.insurance != null ? Number(body.insurance) : undefined,
      accessories: body.accessories != null ? Number(body.accessories) : undefined,
      warranty: body.warranty != null ? Number(body.warranty) : undefined,
      servicePackage: body.servicePackage != null ? Number(body.servicePackage) : undefined,
      fees: body.fees != null ? Number(body.fees) : undefined,
      other: body.other != null ? Number(body.other) : undefined,
      depositAmount: Number(body.depositAmount || 0),
      currency: body.currency || 'USD',
      notes: body.notes
        ? String(body.notes)
        : `connectTenantId=${ctx.connectTenantId}`,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: auth.userId,
      status: body.status || 'quoted',
    };

    const total = computeDealTotal(payload);
    const deal = await createDeal({ ...payload, total });
    await dispatchTenantWebhook(ctx.dealTenantId, 'deal.updated', {
      dealId: deal.id,
      status: deal.status,
      total: deal.total,
    });

    return NextResponse.json(
      { deal, connect: ctx },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[seller deals POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
