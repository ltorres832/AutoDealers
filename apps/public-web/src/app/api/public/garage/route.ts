import { NextRequest, NextResponse } from 'next/server';
import {
  attachGarageToAccount,
  getGarageByUserId,
  pickSelectedGarageVehicle,
  suggestBusinessesForVehicle,
} from '@autodealers/core';
import { getCustomerFromRequest } from '../../../../lib/garage-request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const vehicleId = request.nextUrl.searchParams.get('vehicleId') || '';
    const customer = await getCustomerFromRequest(request);

    // Requerir autenticación obligatoria
    if (!customer) {
      return NextResponse.json(
        { error: 'Mi Garage requiere autenticación. Por favor inicia sesión para acceder.' },
        { status: 401 }
      );
    }

    let garage = await attachGarageToAccount({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
    });
    
    if (!garage) {
      garage = await getGarageByUserId(customer.id);
    }

    if (!garage) {
      return NextResponse.json({
        garage: null,
        selectedVehicle: null,
        suggestions: { groups: [] },
        authenticated: true,
      });
    }

    const selectedVehicle = pickSelectedGarageVehicle(garage, vehicleId || undefined);
    const suggestions = selectedVehicle
      ? await suggestBusinessesForVehicle({
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
        })
      : { groups: [] };

    return NextResponse.json({
      garage,
      selectedVehicle: selectedVehicle || null,
      suggestions,
      authenticated: true,
    });
  } catch (error: any) {
    console.error('Error loading garage:', error);
    return NextResponse.json({ error: 'No se pudo cargar el garage' }, { status: 500 });
  }
}
