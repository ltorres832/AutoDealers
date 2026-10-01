import { NextRequest, NextResponse } from 'next/server';
import { addManualGarageVehicle, pickSelectedGarageVehicle, suggestBusinessesForVehicle } from '@autodealers/core';
import { getCustomerFromRequest } from '../../../../../lib/garage-request-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await getCustomerFromRequest(request);
    const garage = await addManualGarageVehicle({
      userId: customer?.id,
      token: body.token ? String(body.token) : undefined,
      email: body.email ? String(body.email) : customer?.email,
      phone: body.phone ? String(body.phone) : customer?.phone,
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
      authenticated: Boolean(customer),
    });
  } catch (error: any) {
    console.error('Error adding garage vehicle:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo guardar el vehículo' },
      { status: 400 }
    );
  }
}
