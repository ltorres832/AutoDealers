import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomotiveBusinessBySlug,
  listBusinessServices,
  isFeatureEnabled,
  getCategoryTaxonomy,
  resolveSpecializationLabels,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categorySlug: string; businessSlug: string }> }
) {
  try {
    const enabled = await isFeatureEnabled('public', 'automotive_businesses_enabled');
    if (!enabled) {
      return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    }
    const { categorySlug, businessSlug } = await params;
    const business = await getAutomotiveBusinessBySlug(categorySlug, businessSlug);
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }
    const taxonomy = business.categorySlug ? await getCategoryTaxonomy(business.categorySlug) : null;
    const services = (await listBusinessServices(business.id, true)).map((svc) => ({
      ...svc,
      specialtyLabels: resolveSpecializationLabels(svc.specialtySlugs, taxonomy?.specialties),
      vehicleScopeLabels: resolveSpecializationLabels(svc.vehicleScopeSlugs, taxonomy?.vehicleScopes),
    }));
    return NextResponse.json({
      business: {
        ...business,
        specialtyLabels: resolveSpecializationLabels(business.specialtySlugs, taxonomy?.specialties),
        vehicleScopeLabels: resolveSpecializationLabels(business.vehicleScopeSlugs, taxonomy?.vehicleScopes),
      },
      services,
    });
  } catch (error: any) {
    console.error('Error loading business profile:', error);
    return NextResponse.json({ error: 'Error al cargar el negocio' }, { status: 500 });
  }
}
