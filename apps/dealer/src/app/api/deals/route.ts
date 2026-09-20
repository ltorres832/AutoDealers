import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { createDeal, listDeals, computeDealTotal } from '@autodealers/crm';
import { dispatchTenantWebhook } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const leadId = searchParams.get('leadId') || undefined;
    const vehicleId = searchParams.get('vehicleId') || undefined;
    const deals = await listDeals(auth.tenantId, { status, leadId, vehicleId, limit: 100 });
    return NextResponse.json({ deals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[deals GET]', error);
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
    const vehicleId = String(body.vehicleId || '').trim();
    const buyerName = String(body.buyer?.fullName || body.buyerName || '').trim();
    if (!vehicleId || !buyerName) {
      return NextResponse.json(
        { error: 'vehicleId y buyer.fullName son requeridos' },
        { status: 400 }
      );
    }

    const payload = {
      tenantId: auth.tenantId,
      leadId: body.leadId ? String(body.leadId) : undefined,
      vehicleId,
      sellerId: body.sellerId ? String(body.sellerId) : auth.userId,
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
      notes: body.notes ? String(body.notes) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: auth.userId,
      status: body.status || 'quoted',
    };

    const total = computeDealTotal(payload);
    const deal = await createDeal({ ...payload, total });
    await dispatchTenantWebhook(auth.tenantId, 'deal.updated', {
      dealId: deal.id,
      status: deal.status,
      total: deal.total,
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[deals POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
