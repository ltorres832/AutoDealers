import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled, registerAutomotiveBusiness, PlatformProfileExistsError } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const enabled = await isFeatureEnabled('public', 'business_registration_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'El registro de negocios no está habilitado.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = await registerAutomotiveBusiness({
      name: String(body.name || ''),
      email: String(body.email || ''),
      password: String(body.password || ''),
      phone: body.phone,
      companyName: String(body.companyName || body.name || ''),
      categorySlug: String(body.categorySlug || ''),
      municipality: body.municipality,
      city: body.city,
      address: body.address,
      description: body.description,
      hours: body.hours,
      mobileService: body.mobileService === true,
      membershipId: body.membershipId,
      acceptPlatformTerms: body.acceptPlatformTerms === true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof PlatformProfileExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error?.message || 'No se pudo registrar el negocio' },
      { status: 400 }
    );
  }
}
