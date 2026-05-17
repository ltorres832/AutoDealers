import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createVehicle } from '@autodealers/inventory';
import { createNotification, resolveSellerVehicleCreatePolicy } from '@autodealers/core';
import {
  findSellerVehicleById,
  filterVehiclesOwnedBySeller,
  loadVehiclesForSellerWorkspace,
} from '@/lib/seller-vehicles';

function serializeVehicle(v: Record<string, unknown> & { id: string }) {
  const createdAt = v.createdAt as Date | string | undefined;
  const updatedAt = v.updatedAt as Date | string | undefined;
  const soldAt = v.soldAt as Date | string | undefined;
  return {
    ...v,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === 'string'
          ? createdAt
          : new Date().toISOString(),
    updatedAt:
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : typeof updatedAt === 'string'
          ? updatedAt
          : new Date().toISOString(),
    soldAt:
      soldAt instanceof Date
        ? soldAt.toISOString()
        : typeof soldAt === 'string'
          ? soldAt
          : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (vehicleId) {
      const found = await findSellerVehicleById(auth, vehicleId);
      if (!found) {
        return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      }
      return NextResponse.json({
        vehicle: serializeVehicle(found.vehicle as Record<string, unknown> & { id: string }),
      });
    }

    const all = await loadVehiclesForSellerWorkspace(auth);
    const mine = filterVehiclesOwnedBySeller(all, auth.userId);

    const statusFilter = searchParams.get('status');
    const filtered =
      statusFilter && statusFilter !== 'all'
        ? mine.filter((v) => String(v.status ?? '').toLowerCase() === statusFilter.toLowerCase())
        : mine;

    return NextResponse.json({
      vehicles: filtered.map((v) =>
        serializeVehicle(v as Record<string, unknown> & { id: string })
      ),
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    delete (body as any).isFreePublicListing;
    delete (body as any).freeListingExpiresAt;

    const policy = await resolveSellerVehicleCreatePolicy(auth.tenantId, auth.userId);
    if (policy.mode === 'blocked') {
      return NextResponse.json({ error: policy.message }, { status: policy.status });
    }

    const payload =
      policy.mode === 'free'
        ? {
            ...body,
            isFreePublicListing: true,
            freeListingExpiresAt: policy.expiresAt,
            publishedOnPublicPage: body.publishedOnPublicPage !== false,
          }
        : { ...body };

    console.log('📥 POST /api/vehicles - Datos recibidos:', {
      make: body.make,
      model: body.model,
      bodyType: body.bodyType || 'NO ENVIADO',
    });
    console.log(`💾 Guardando vehículo con tenantId: "${auth.tenantId}" y sellerId: "${auth.userId}"`);
    const vehicle = await createVehicle(auth.tenantId, payload, auth.userId);
    console.log(`✅ Vehículo creado con sellerId: ${(vehicle as any).sellerId || 'NO ASIGNADO'}`);

    try {
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'system_alert',
        title: 'Vehículo Creado',
        message: `Se ha agregado un nuevo vehículo: ${body.year} ${body.make} ${body.model}`,
        channels: ['system'],
        metadata: { vehicleId: vehicle.id },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
