import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getVehicleByStockNumber, buildVehicleStockSnapshot } from '@autodealers/inventory';

export const dynamic = 'force-dynamic';

/** GET ?stock=STK-... — inventario completo + snapshot para leads/FI */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stock = request.nextUrl.searchParams.get('stock')?.trim();
    if (!stock) {
      return NextResponse.json({ error: 'Parámetro stock requerido' }, { status: 400 });
    }

    const vehicle = await getVehicleByStockNumber(auth.tenantId, stock);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      vehicle,
      snapshot: buildVehicleStockSnapshot(vehicle),
    });
  } catch (e) {
    console.error('vehicles/lookup', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
