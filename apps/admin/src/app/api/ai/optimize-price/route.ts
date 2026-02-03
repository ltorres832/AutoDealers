import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { optimizeVehiclePrice } from '@autodealers/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId es requerido' }, { status: 400 });
    }

    const optimization = await optimizeVehiclePrice(auth.tenantId, vehicleId);

    return NextResponse.json({ optimization });
  } catch (error: any) {
    console.error('Error optimizando precio:', error);
    return NextResponse.json(
      { error: 'Error al optimizar precio', details: error.message },
      { status: 500 }
    );
  }
}


