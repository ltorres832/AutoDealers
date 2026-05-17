import { NextRequest, NextResponse } from 'next/server';
import { getVehicleById } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/core';
import { normalizeVehiclePayload } from '@/lib/vehicle-photos-normalize';
import { isVehicleVisibleOnPublicListing } from '@/lib/public-catalog-visibility';
import { enrichPublicVehicleDetail } from '@/lib/enrich-public-vehicle';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      // Si no hay tenantId, buscar en todos los tenants
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .get();

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tId = tenantDoc.id;
        try {
          const vehicle = await getVehicleById(tId, id);
          if (vehicle && isVehicleVisibleOnPublicListing(vehicle as Record<string, unknown>)) {
            const enriched = await enrichPublicVehicleDetail(
              { ...vehicle } as Record<string, unknown>,
              tId
            );
            return NextResponse.json({
              vehicle: normalizeVehiclePayload(enriched),
            });
          }
        } catch (error) {
          // Continuar buscando en otros tenants
        }
      }

      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Si hay tenantId, buscar directamente
    const vehicle = await getVehicleById(tenantId, id);
    
    console.log(`🔍 Vehículo encontrado para ${tenantId}/${id}:`, {
      found: !!vehicle,
      published: vehicle?.publishedOnPublicPage,
      photos: vehicle?.photos?.length || 0,
      price: vehicle?.price,
      hasDescription: !!vehicle?.description
    });
    
    if (!vehicle || !isVehicleVisibleOnPublicListing(vehicle as Record<string, unknown>)) {
      console.log(`❌ Vehículo no encontrado o no listable públicamente: ${tenantId}/${id}`);
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const enriched = await enrichPublicVehicleDetail(
      { ...vehicle } as Record<string, unknown>,
      tenantId
    );

    console.log(
      `✅ Devolviendo vehículo: ${vehicle.make} ${vehicle.model}, vendedor=${enriched.sellerName || '—'}`
    );
    return NextResponse.json({
      vehicle: normalizeVehiclePayload(enriched),
    });
  } catch (error: any) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

