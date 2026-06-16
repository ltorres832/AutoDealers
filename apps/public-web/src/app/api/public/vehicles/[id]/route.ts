import { NextRequest, NextResponse } from 'next/server';
import { normalizeVehiclePayload } from '@/lib/vehicle-photos-normalize';
import { enrichPublicVehicleDetail } from '@/lib/enrich-public-vehicle';
import { findPublicVehicleById } from '@/lib/resolve-public-vehicle';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hintTenantId = searchParams.get('tenantId');
    const sellerId = searchParams.get('sellerId');

    const found = await findPublicVehicleById(id, {
      hintTenantId,
      sellerId,
    });

    if (!found) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const enriched = await enrichPublicVehicleDetail(found.vehicle, found.tenantId);

    return NextResponse.json({
      vehicle: normalizeVehiclePayload({
        ...enriched,
        tenantId: found.tenantId,
      }),
    });
  } catch (error: unknown) {
    console.error('Error fetching vehicle:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
