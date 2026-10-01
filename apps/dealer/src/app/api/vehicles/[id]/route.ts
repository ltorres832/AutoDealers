import { NextRequest, NextResponse } from 'next/server';
import { updateVehicle } from '@autodealers/inventory';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

async function resolveVehicleTenantId(
  auth: { tenantId: string; dealerId?: string },
  vehicleId: string
): Promise<string | null> {
  const tenantIds = [auth.tenantId];
  if (auth.dealerId && auth.dealerId !== auth.tenantId) {
    tenantIds.push(auth.dealerId);
  }
  for (const tenantId of tenantIds) {
    const snap = await db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId).get();
    if (snap.exists) return tenantId;
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveVehicleTenantId({ tenantId: auth.tenantId, dealerId: auth.dealerId }, id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.specifications && typeof body.specifications === 'object' && !Array.isArray(body.specifications)) updateData.specifications = body.specifications;
    if (body.bodyType !== undefined) updateData.bodyType = body.bodyType;
    if (body.masterDescription !== undefined) updateData.masterDescription = body.masterDescription;
    if (body.descriptionMeta !== undefined) updateData.descriptionMeta = body.descriptionMeta;
    for (const key of ['packages','accessories','modifications']) if (Array.isArray(body[key])) updateData[key] = body[key].filter((value:unknown)=>typeof value==='string').slice(0,40);
    if (body.confirmedNotes !== undefined) updateData.confirmedNotes = body.confirmedNotes;
    if (body.make !== undefined) updateData.make = body.make;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.year !== undefined) updateData.year = body.year;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.mileageUnit === 'mi' || body.mileageUnit === 'km') updateData.mileageUnit = body.mileageUnit;
    if (body.mileage !== undefined) updateData.mileage = body.mileage === '' || body.mileage === null ? undefined : parseInt(body.mileage, 10);
    if (body.photos !== undefined) updateData.photos = Array.isArray(body.photos) ? body.photos : [];
    if (body.videos !== undefined) updateData.videos = Array.isArray(body.videos) ? body.videos : [];
    if (body.publishedOnPublicPage !== undefined) updateData.publishedOnPublicPage = body.publishedOnPublicPage;
    if (body.vin !== undefined) {
      updateData.vin = String(body.vin || '').toUpperCase().trim();
      updateData.specifications = {
        ...((body.specifications as object) || {}),
        vin: updateData.vin,
      };
    }

    await updateVehicle(tenantId, id, updateData as never, {userId:auth.userId,role:auth.role,tenantId});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('dealer PUT /api/vehicles/[id]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isVin = /VIN/i.test(message);
    return NextResponse.json(
      { error: (error as any)?.code === 'description_conflict' ? 'La descripción cambió en otra sesión. Vuelve a abrir el vehículo antes de guardar.' : isVin ? message : 'No se pudo guardar. Revisa la descripción e inténtalo nuevamente.' },
      { status: typeof (error as any)?.status === 'number' ? (error as any).status : isVin ? 400 : 500 }
    );
  }
}
