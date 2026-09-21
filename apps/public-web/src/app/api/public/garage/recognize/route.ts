import { NextRequest, NextResponse } from 'next/server';
import { recognizeGarageVehicle, suggestBusinessesForVehicle } from '@autodealers/core';
import { getCustomerFromRequest } from '../../../../../lib/garage-request-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request);

    // Requerir autenticación obligatoria
    if (!customer) {
      return NextResponse.json(
        { error: 'Mi Garage requiere autenticación. Por favor inicia sesión para acceder.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const garage = await recognizeGarageVehicle({
      email: customer.email,
      phone: customer.phone,
      userId: customer.id,
      year: body.year ? Number(body.year) : undefined,
      make: body.make,
      model: body.model,
      trim: body.trim,
      source: body.source || 'listing',
      listingId: body.listingId,
    });
    const suggestions = await suggestBusinessesForVehicle({
      make: body.make,
      model: body.model,
      year: body.year ? Number(body.year) : undefined,
      municipality: body.municipality,
    });
    return NextResponse.json({ garage, suggestions, authenticated: true });
  } catch (error: any) {
    console.error('Error recognizing garage:', error);
    return NextResponse.json({ error: 'No se pudo reconocer el vehículo' }, { status: 500 });
  }
}
