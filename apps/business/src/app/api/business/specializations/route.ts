import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { getAutomotiveBusinessById, getCategoryTaxonomy } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const business = await getAutomotiveBusinessById(auth.tenantId);
  const taxonomy = business?.categorySlug ? await getCategoryTaxonomy(business.categorySlug) : null;
  return NextResponse.json({
    categorySlug: business?.categorySlug || '',
    specialties: taxonomy?.specialties || [],
    vehicleScopes: taxonomy?.vehicleScopes || [],
  });
}
