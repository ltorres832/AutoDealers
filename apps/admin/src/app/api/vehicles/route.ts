export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getVehicles, createVehicle } from '@autodealers/inventory';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const make = searchParams.get('make');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const vehicles = await getVehicles(auth.tenantId, {
      status: status as any,
      make: make || undefined,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });

    return NextResponse.json({ vehicles });
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
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Si el body incluye sellerId, pasarlo; si no, y el usuario es seller, usar auth.userId
    const sellerId = body.sellerId || (auth.role === 'seller' ? auth.userId : undefined);
    const vehicle = await createVehicle(auth.tenantId, body, sellerId);
    console.log(`✅ Vehículo creado por ${auth.role} con sellerId: ${(vehicle as any).sellerId || 'NO ASIGNADO'}`);

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





