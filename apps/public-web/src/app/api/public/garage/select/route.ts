import { NextRequest, NextResponse } from 'next/server';
import { pickSelectedGarageVehicle, setSelectedGarageVehicle, suggestBusinessesForVehicle } from '@autodealers/core';
import { getCustomerFromRequest } from '../../../../../lib/garage-request-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await getCustomerFromRequest(request);

    // Requerir autenticación obligatoria
    if (!customer) {
      return NextResponse.json(
        { error: 'Mi Garage requiere autenticación. Por favor inicia sesión para acceder.' },
        { status: 401 }
      );
    }

    const garage = await setSelectedGarageVehicle({
      userId: customer.id,
      vehicleId: String(body.vehicleId || ''),
    });

    if (!garage) {
      return NextResponse.json({ error: 'No se encontró el garage' }, { status: 404 });
    }

    const selectedVehicle = pickSelectedGarageVehicle(garage, String(body.vehicleId || ''));
    const suggestions = await suggestBusinessesForVehicle({
      make: selectedVehicle?.make,
      model: selectedVehicle?.model,
      year: selectedVehicle?.year,
    });

    return NextResponse.json({
      garage,
      selectedVehicle: selectedVehicle || null,
      suggestions,
      authenticated: true,
    });
  } catch (error: any) {
    console.error('Error selecting garage vehicle:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo seleccionar el vehículo' },
      { status: 400 }
    );
  }
}
