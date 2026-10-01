import { NextRequest, NextResponse } from 'next/server';
import { pickSelectedGarageVehicle, setSelectedGarageVehicle, suggestBusinessesForVehicle } from '@autodealers/core';
import { getCustomerFromRequest } from '../../../../../lib/garage-request-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await getCustomerFromRequest(request);
    const garage = await setSelectedGarageVehicle({
      userId: customer?.id,
      token: body.token ? String(body.token) : undefined,
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
      authenticated: Boolean(customer),
    });
  } catch (error: any) {
    console.error('Error selecting garage vehicle:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo seleccionar el vehículo' },
      { status: 400 }
    );
  }
}
