export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getVehicleById, updateVehicle } from '@autodealers/inventory';
import type { Vehicle } from '@autodealers/inventory';

function serializeVehicle(v: Vehicle) {
  const anyV = v as unknown as Record<string, unknown>;
  const iso = (d: unknown) =>
    d instanceof Date ? d.toISOString() : typeof d === 'string' ? d : null;
  return {
    ...anyV,
    createdAt: iso(anyV.createdAt),
    updatedAt: iso(anyV.updatedAt),
    soldAt: iso(anyV.soldAt),
    freeListingExpiresAt: iso(anyV.freeListingExpiresAt),
  };
}

const PATCHABLE = new Set([
  'make',
  'model',
  'year',
  'vin',
  'price',
  'mileage',
  'condition',
  'color',
  'transmission',
  'fuelType',
  'description',
  'features',
  'status',
  'photos',
  'videos',
  'currency',
  'bodyType',
  'publishedOnPublicPage',
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; vehicleId: string }> }
) {
  try {
    const { tenantId, vehicleId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!tenantId || !vehicleId) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }
    const vehicle = await getVehicleById(tenantId, vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ vehicle: serializeVehicle(vehicle) });
  } catch (error) {
    console.error('GET admin vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; vehicleId: string }> }
) {
  try {
    const { tenantId, vehicleId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!tenantId || !vehicleId) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const existing = await getVehicleById(tenantId, vehicleId);
    if (!existing) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    for (const key of Object.keys(body)) {
      if (!PATCHABLE.has(key)) continue;
      updates[key] = body[key];
    }

    if (typeof updates.year === 'string') {
      updates.year = parseInt(updates.year, 10);
    }
    if (typeof updates.price === 'string') {
      updates.price = parseFloat(updates.price);
    }
    if (typeof updates.mileage === 'string' && updates.mileage !== '') {
      updates.mileage = parseInt(String(updates.mileage), 10);
    }

    if (updates.year !== undefined && (Number.isNaN(updates.year) || (updates.year as number) < 1900)) {
      return NextResponse.json({ error: 'Año inválido' }, { status: 400 });
    }
    if (updates.price !== undefined && (Number.isNaN(updates.price) || (updates.price as number) < 0)) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    }

    const spec: Record<string, unknown> = { ...(existing.specifications || {}) };
    const syncKeys = ['make', 'model', 'year', 'vin', 'color', 'mileage', 'transmission', 'fuelType'] as const;
    for (const k of syncKeys) {
      if (updates[k] !== undefined) {
        spec[k] = updates[k];
      } else if ((existing as unknown as Record<string, unknown>)[k] !== undefined) {
        spec[k] = (existing as unknown as Record<string, unknown>)[k];
      }
    }
    (updates as Partial<Vehicle>).specifications = spec as Vehicle['specifications'];

    await updateVehicle(tenantId, vehicleId, updates as Partial<Vehicle>);

    const fresh = await getVehicleById(tenantId, vehicleId);
    return NextResponse.json({ vehicle: fresh ? serializeVehicle(fresh) : null });
  } catch (error) {
    console.error('PATCH admin vehicle:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
