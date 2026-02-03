import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const vehicleId = params.id;

    if (!tenantId || !vehicleId) {
      return NextResponse.json(
        { error: 'tenantId and vehicleId are required' },
        { status: 400 }
      );
    }

    console.log('🔍 GET /api/public/vehicles/[id] - Buscando vehículo:', { tenantId, vehicleId });

    // Obtener el vehículo directamente
    const vehicleDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .get();

    if (!vehicleDoc.exists) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicleData = vehicleDoc.data();

    // Verificar que esté publicado en la página pública
    if (vehicleData?.publishedOnPublicPage !== true) {
      return NextResponse.json(
        { error: 'Vehicle not published on public page' },
        { status: 404 }
      );
    }

    // Obtener información del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

    // Buscar el seller asociado
    let sellerId: string | null = null;
    let sellerRating = 0;
    let sellerRatingCount = 0;

    try {
      const sellersSnapshot = await db
        .collection('users')
        .where('tenantId', '==', tenantId)
        .where('role', '==', 'seller')
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!sellersSnapshot.empty) {
        const sellerDoc = sellersSnapshot.docs[0];
        sellerId = sellerDoc.id;
        const sellerData = sellerDoc.data();
        sellerRating = sellerData.sellerRating || 0;
        sellerRatingCount = sellerData.sellerRatingCount || 0;
      }
    } catch (error) {
      console.warn('⚠️ Error buscando seller:', error);
    }

    // Obtener fotos - NO filtrar tan estrictamente, solo limpiar
    const allPhotos = vehicleData.photos || [];
    
    // Solo filtrar valores null/undefined y strings vacíos, pero aceptar cualquier string que parezca URL
    const validPhotos = allPhotos
      .filter((photo: any) => {
        if (!photo) return false;
        if (typeof photo !== 'string') return false;
        const trimmed = photo.trim();
        return trimmed !== '' && trimmed !== 'undefined' && !trimmed.toLowerCase().includes('undefined');
      })
      .map((photo: string) => photo.trim());

    // Obtener stockNumber
    const stockNumber = vehicleData.stockNumber || vehicleData.specifications?.stockNumber;

    const vehicle = {
      id: vehicleDoc.id,
      tenantId,
      tenantName: tenantData?.name || 'Concesionario',
      sellerId,
      sellerRating,
      sellerRatingCount,
      ...vehicleData,
      stockNumber,
      specifications: {
        ...vehicleData.specifications,
        stockNumber,
      },
      photos: validPhotos,
      videos: vehicleData.videos || [],
      createdAt: vehicleData?.createdAt?.toDate()?.toISOString(),
      updatedAt: vehicleData?.updatedAt?.toDate()?.toISOString(),
    };

    console.log('✅ Vehículo encontrado:', {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      photosCount: validPhotos.length,
      stockNumber,
      firstPhoto: validPhotos[0] || 'NO HAY FOTOS',
    });

    return NextResponse.json(vehicle);
  } catch (error: any) {
    console.error('❌ Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

