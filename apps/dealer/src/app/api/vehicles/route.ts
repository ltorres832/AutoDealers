import { NextRequest, NextResponse } from 'next/server';
import { getVehicles, createVehicle } from '@autodealers/inventory';
import { verifyAuth } from '@/lib/auth';
import { createNotification } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const make = searchParams.get('make');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const vehicles = await getVehicles(auth.tenantId!, {
      status: status as any,
      make: make || undefined,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });

    return NextResponse.json({
      vehicles: vehicles.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
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
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validar límite de inventario
    const { canPerformAction } = await import('@autodealers/core');
    const validation = await canPerformAction(auth.tenantId!, 'addVehicle');
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 403 }
      );
    }

    const body = await request.json();
    // Si el body incluye sellerId, pasarlo
    const sellerId = body.sellerId || undefined;
    const vehicle = await createVehicle(auth.tenantId!, body, sellerId);
    console.log(`✅ Vehículo creado por ${auth.role} con sellerId: ${(vehicle as any).sellerId || 'NO ASIGNADO'}`);

    // Crear notificación
    try {
      await createNotification({
        tenantId: auth.tenantId!,
        userId: auth.userId,
        type: 'system_alert',
        title: 'Vehículo Creado',
        message: `Se ha agregado un nuevo vehículo: ${body.year} ${body.make} ${body.model}`,
        channels: ['system'],
        metadata: { vehicleId: vehicle.id },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // No fallar la creación del vehículo si falla la notificación
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

