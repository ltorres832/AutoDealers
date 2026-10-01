import { NextRequest, NextResponse } from 'next/server';
import {
  attachGarageToAccount,
  getGarageByToken,
  getGarageByUserId,
  pickSelectedGarageVehicle,
  suggestBusinessesForVehicle,
} from '@autodealers/core';
import { getCustomerFromRequest } from '../../../../lib/garage-request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const vehicleId = request.nextUrl.searchParams.get('vehicleId') || '';
    const customer = await getCustomerFromRequest(request);

    let garage = null;
    if (customer) {
      garage = await attachGarageToAccount({
        userId: customer.id,
        email: customer.email,
        phone: customer.phone,
        token: token || undefined,
      });
      if (!garage) {
        garage = await getGarageByUserId(customer.id);
      }
    } else if (token) {
      garage = await getGarageByToken(token);
    }

    if (!garage) {
      return NextResponse.json({
        garage: null,
        selectedVehicle: null,
        suggestions: { groups: [] },
        authenticated: Boolean(customer),
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
      authenticated: Boolean(customer),
    });
  } catch (error: any) {
    console.error('Error loading garage:', error);
    return NextResponse.json({ error: 'No se pudo cargar el garage' }, { status: 500 });
  }
}
