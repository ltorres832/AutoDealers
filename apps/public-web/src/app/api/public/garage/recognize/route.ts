import { NextRequest, NextResponse } from 'next/server';
import { recognizeGarageVehicle, suggestBusinessesForVehicle } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const garage = await recognizeGarageVehicle({
      email: body.email,
      phone: body.phone,
      userId: body.userId,
      token: body.token,
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
    return NextResponse.json({ garage, suggestions });
  } catch (error: any) {
    console.error('Error recognizing garage:', error);
    return NextResponse.json({ error: 'No se pudo reconocer el vehículo' }, { status: 500 });
  }
}
