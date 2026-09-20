import { NextRequest, NextResponse } from 'next/server';
import {
  isFeatureEnabled,
  listBusinessCategories,
  listPublishedAutomotiveBusinesses,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const enabled = await isFeatureEnabled('public', 'automotive_businesses_enabled');
    if (!enabled) {
      return NextResponse.json({ enabled: false, categories: [], businesses: [] });
    }

    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make') || undefined;
    const model = searchParams.get('model') || undefined;
    const yearRaw = searchParams.get('year');
    const year = yearRaw ? Number(yearRaw) : undefined;
    const specialtySlugs = (searchParams.get('specialties') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const vehicleScopeSlugs = (searchParams.get('scopes') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const vehicleAware = Boolean(make || model || year || vehicleScopeSlugs.length);
    const [categories, businesses] = await Promise.all([
      listBusinessCategories(true),
      listPublishedAutomotiveBusinesses({
        categorySlug: searchParams.get('category') || undefined,
        municipality: searchParams.get('municipality') || undefined,
        query: searchParams.get('q') || undefined,
        mobileService: searchParams.get('mobile') === '1' ? true : undefined,
        make,
        model,
        year: year && Number.isFinite(year) ? year : undefined,
        specialtySlugs,
        vehicleScopeSlugs,
        requireDeclaredSpecializations: vehicleAware || specialtySlugs.length > 0,
        limit: vehicleAware || specialtySlugs.length ? 80 : 200,
      }),
    ]);

    return NextResponse.json({
      enabled: true,
      categories,
      businesses,
      vehicle: vehicleAware
        ? { make, model, year: year && Number.isFinite(year) ? year : undefined }
        : null,
    });
  } catch (error: any) {
    console.error('Error listing servicios:', error);
    return NextResponse.json({ error: 'No se pudo cargar el directorio' }, { status: 500 });
  }
}
