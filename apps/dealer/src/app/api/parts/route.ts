import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { createPart, listParts, updatePart, adjustPartStock } from '@autodealers/inventory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const search = new URL(request.url).searchParams.get('search') || undefined;
    const parts = await listParts(auth.tenantId, { search, limit: 300 });
    return NextResponse.json({ parts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const part = await createPart({
      tenantId: auth.tenantId,
      sku: body.sku,
      name: body.name,
      description: body.description,
      qtyOnHand: Number(body.qtyOnHand || 0),
      cost: Number(body.cost || 0),
      price: Number(body.price || 0),
      location: body.location,
      active: body.active !== false,
    });
    return NextResponse.json({ part }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    if (body.action === 'adjust') {
      const part = await adjustPartStock(
        auth.tenantId,
        id,
        Number(body.delta || 0),
        body.reason
      );
      return NextResponse.json({ part });
    }

    const part = await updatePart(auth.tenantId, id, {
      name: body.name,
      description: body.description,
      cost: body.cost != null ? Number(body.cost) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
      location: body.location,
      active: body.active,
      qtyOnHand: body.qtyOnHand != null ? Number(body.qtyOnHand) : undefined,
    });
    return NextResponse.json({ part });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
