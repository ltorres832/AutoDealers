import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getShopEstimate,
  updateShopEstimate,
  shopEstimatePlainText,
  convertEstimateToRepairOrder,
  convertEstimateToInvoice,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const estimate = await getShopEstimate(auth.tenantId, id);
  if (!estimate) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (new URL(request.url).searchParams.get('format') === 'text') {
    return new NextResponse(shopEstimatePlainText(estimate), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return NextResponse.json({ estimate });
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
    if (body.action === 'to_ro') {
      const order = await convertEstimateToRepairOrder(auth.tenantId, id, auth.userId);
      return NextResponse.json({ order });
    }
    if (body.action === 'to_invoice') {
      const invoice = await convertEstimateToInvoice(auth.tenantId, id, auth.userId);
      return NextResponse.json({ invoice });
    }
    const patch: Record<string, unknown> = {};
    for (const k of [
      'status',
      'customerName',
      'customerEmail',
      'customerPhone',
      'vehicleLabel',
      'vin',
      'plate',
      'labor',
      'parts',
      'tax',
      'notes',
      'photos',
      'videos',
      'leadId',
    ]) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    const estimate = await updateShopEstimate(auth.tenantId, id, patch);
    return NextResponse.json({ estimate });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
