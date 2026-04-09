import { NextRequest, NextResponse } from 'next/server';
import { getVehicleById } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/core';
import { normalizeVehiclePayload } from '@/lib/vehicle-photos-normalize';

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
          if (vehicle && vehicle.publishedOnPublicPage !== false) {
            return NextResponse.json({
              vehicle: normalizeVehiclePayload({ ...vehicle } as Record<string, unknown>),
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
    
    if (!vehicle || vehicle.publishedOnPublicPage === false) {
      console.log(`❌ Vehículo no encontrado o no publicado: ${tenantId}/${id}`);
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Devolviendo vehículo: ${vehicle.make} ${vehicle.model}, ${vehicle.photos?.length || 0} fotos`);
    return NextResponse.json({
      vehicle: normalizeVehiclePayload({ ...vehicle } as Record<string, unknown>),
    });
  } catch (error: any) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

