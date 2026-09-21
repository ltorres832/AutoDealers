import { NextRequest, NextResponse } from 'next/server';
import { addManualGarageVehicle, pickSelectedGarageVehicle, suggestBusinessesForVehicle } from '@autodealers/core';
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

    const garage = await addManualGarageVehicle({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      year: Number(body.year),
      make: String(body.make || ''),
      model: String(body.model || ''),
      trim: body.trim ? String(body.trim) : undefined,
      mileage: body.mileage ? Number(body.mileage) : undefined,
      vin: body.vin ? String(body.vin) : undefined,
      plate: body.plate ? String(body.plate) : undefined,
      color: body.color ? String(body.color) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      insuranceDueAt: body.insuranceDueAt ? String(body.insuranceDueAt) : undefined,
      inspectionDueAt: body.inspectionDueAt ? String(body.inspectionDueAt) : undefined,
      marbeteDueAt: body.marbeteDueAt ? String(body.marbeteDueAt) : undefined,
      lastTireRotationAt: body.lastTireRotationAt ? String(body.lastTireRotationAt) : undefined,
    });

    if (!garage) {
      return NextResponse.json({ error: 'No se pudo guardar el vehículo' }, { status: 400 });
    }

    const selectedVehicle = pickSelectedGarageVehicle(garage);
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
    console.error('Error adding garage vehicle:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo guardar el vehículo' },
      { status: 400 }
    );
  }
}
