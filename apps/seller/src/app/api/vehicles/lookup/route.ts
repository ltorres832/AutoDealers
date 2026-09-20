import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getVehicleByStockNumber,
  getVehicleById,
  buildVehicleStockSnapshot,
  findVehiclesByVin,
} from '@autodealers/inventory';
import { toVinNormalized } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/** GET ?stock=... | ?vin=... */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stock = request.nextUrl.searchParams.get('stock')?.trim();
    const vinRaw = request.nextUrl.searchParams.get('vin')?.trim();

    if (!stock && !vinRaw) {
      return NextResponse.json(
        { error: 'Parámetro stock o vin requerido' },
        { status: 400 }
      );
    }

    let vehicle = null as Awaited<ReturnType<typeof getVehicleById>>;

    if (stock) {
      vehicle = await getVehicleByStockNumber(auth.tenantId, stock);
    } else if (vinRaw) {
      const vinNormalized = toVinNormalized(vinRaw);
      if (!vinNormalized) {
        return NextResponse.json({ error: 'VIN inválido' }, { status: 400 });
      }
      const matches = (await findVehiclesByVin(vinNormalized)).filter(
        (m) => m.tenantId === auth.tenantId
      );
      if (matches.length === 0) {
        return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      }
      vehicle = await getVehicleById(matches[0].tenantId, matches[0].vehicleId);
    }

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
