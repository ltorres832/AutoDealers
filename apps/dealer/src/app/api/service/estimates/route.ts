import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { createShopEstimate, listShopEstimates } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const status = new URL(request.url).searchParams.get('status') as any;
  const estimates = await listShopEstimates(auth.tenantId, { status, limit: 100 });
  return NextResponse.json({ estimates });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    if (!body.customerName) {
      return NextResponse.json({ error: 'customerName requerido' }, { status: 400 });
    }
    const estimate = await createShopEstimate({
      tenantId: auth.tenantId,
      status: body.status || 'draft',
      customerName: String(body.customerName),
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      leadId: body.leadId,
      vehicleId: body.vehicleId,
      vehicleLabel: body.vehicleLabel,
      vin: body.vin,
      plate: body.plate,
      labor: body.labor || [],
      parts: body.parts || [],
      tax: Number(body.tax || 0),
      notes: body.notes,
      photos: body.photos || [],
      videos: body.videos || [],
      createdBy: auth.userId,
    });
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
