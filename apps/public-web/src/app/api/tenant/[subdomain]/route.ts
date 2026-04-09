import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';
import { getVehicles } from '@autodealers/inventory';
import { normalizeVehiclesArray } from '@/lib/vehicle-photos-normalize';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const db = getFirestore();

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // IGNORAR subdominios técnicos de Firebase App Hosting
    if (subdomain.includes('---')) {
      return NextResponse.json(
        { error: 'Technical domain detected, not a tenant' },
        { status: 404 }
      );
    }

    // Buscar tenant por subdomain
    const tenantsSnapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (tenantsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantDoc = tenantsSnapshot.docs[0];
    const tenantData = tenantDoc.data();
    const tenantId = tenantDoc.id;

    // Obtener vehículos del tenant (solo disponibles)
    const vehicles = await getVehicles(tenantId, {
      status: 'available',
    });

    // Formatear tenant data
    const tenant = {
      id: tenantId,
      name: tenantData.name || '',
      subdomain: tenantData.subdomain || subdomain,
      branding: tenantData.branding || {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
      },
      contactEmail: tenantData.contactEmail,
      contactPhone: tenantData.contactPhone,
      address: tenantData.address,
      website: tenantData.website,
      description: tenantData.description,
      businessHours: tenantData.businessHours,
      sellerInfo: tenantData.sellerInfo,
      socialMedia: tenantData.socialMedia,
      websiteSettings: tenantData.websiteSettings,
    };

    return NextResponse.json({
      tenant,
      vehicles: normalizeVehiclesArray(
        (vehicles || []).map((v) => ({ ...v } as Record<string, unknown>))
      ),
    });
  } catch (error: any) {
    console.error('Error fetching tenant data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
