export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getQuickListingById, incrementQuickListingView } from '@autodealers/core';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const item = await getQuickListingById(id);
    if (!item) {
      return NextResponse.json({ error: 'No encontrado o expirado' }, { status: 404 });
    }
    incrementQuickListingView(id).catch(() => {});
    return NextResponse.json({
      id: item.id,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      city: item.city,
      make: item.make,
      model: item.model,
      year: item.year,
      mileage: item.mileage,
      price: item.price,
      currency: item.currency,
      condition: item.condition,
      transmission: item.transmission,
      fuelType: item.fuelType,
      color: item.color,
      bodyType: item.bodyType,
      description: item.description,
      photos: item.photos,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
    });
  } catch (e) {
    console.error('quick-listings [id] GET:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
