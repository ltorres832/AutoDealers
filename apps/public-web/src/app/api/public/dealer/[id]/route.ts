import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidar cada 60 segundos

export async function generateStaticParams() {
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealerId } = await params;
  console.log(`🚀🚀🚀 [DEALER ENDPOINT] GET called with dealerId: ${dealerId}`);
  try {
    const db = getFirestore();
    console.log(`🔍 [DEALER ENDPOINT] Processing dealerId: ${dealerId}`);

    // Obtener información del dealer
    const dealerDoc = await db.collection('users').doc(dealerId).get();
    if (!dealerDoc.exists) {
      return NextResponse.json({ error: 'Dealer no encontrado' }, { status: 404 });
    }

    const dealerData = dealerDoc.data();
    if (dealerData?.role !== 'dealer' || dealerData?.status !== 'active') {
      return NextResponse.json({ error: 'Dealer no encontrado' }, { status: 404 });
    }

    const tenantId = dealerData.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Dealer no tiene tenant asociado' }, { status: 404 });
    }

    // Obtener información del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const tenantData = tenantDoc.data();

    // Obtener TODOS los vehículos del dealer (sin filtrar por publishedOnPublicPage)
    console.log(`🚀 [DEALER ENDPOINT] Fetching vehicles for tenant: ${tenantId}`);
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    console.log(`🔍 [DEALER ENDPOINT] Total vehicles in dealer tenant ${tenantId}: ${vehiclesSnapshot.size}`);
    
    // Log todos los vehículos para debugging
    vehiclesSnapshot.docs.forEach((doc: any) => {
      const v = doc.data();
      console.log(`  📦 Vehicle ${doc.id}:`, {
        make: v.make,
        model: v.model,
        status: v.status,
        sellerId: v.sellerId,
        assignedTo: v.assignedTo,
      });
    });

    // Filtrar solo los que NO están vendidos o eliminados
    const vehicles = vehiclesSnapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((vehicle: any) => {
        const isExcluded = vehicle.status === 'sold' || 
                          vehicle.status === 'deleted' || 
                          vehicle.status === 'inactive' ||
                          vehicle.deleted === true;
        return !isExcluded;
      });

    console.log(`✅ Returning ${vehicles.length} vehicles from dealer (after filtering excluded statuses)`);

    // Obtener sellers del dealer
    const sellersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'seller')
      .where('status', '==', 'active')
      .get();

    // Contar TODOS los vehículos por vendedor (incluyendo vendidos)
    // IMPORTANTE: Solo contar una vez por vehículo (priorizar sellerId sobre assignedTo)
    const vehiclesBySeller: Record<string, number> = {};
    
    console.log(`🔢 [DEALER ENDPOINT] Starting to count vehicles for ${vehiclesSnapshot.size} total vehicles`);
    
    // Contar TODOS los vehículos (no solo los disponibles)
    vehiclesSnapshot.docs.forEach((doc: any) => {
      const vehicle = doc.data();
      
      // Log para debugging específico de Luis
      if (vehicle.sellerId === '2SD4ppoXesfUxbZDncljy6ZYQVC3' || vehicle.assignedTo === '2SD4ppoXesfUxbZDncljy6ZYQVC3') {
        console.log(`🔍 [DEALER ENDPOINT] Vehicle ${doc.id} for Luis:`, {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          status: vehicle.status,
          sellerId: vehicle.sellerId,
          assignedTo: vehicle.assignedTo,
        });
      }
      
      // Priorizar sellerId sobre assignedTo
      if (vehicle.sellerId) {
        const currentCount = vehiclesBySeller[vehicle.sellerId] || 0;
        vehiclesBySeller[vehicle.sellerId] = currentCount + 1;
        if (vehicle.sellerId === '2SD4ppoXesfUxbZDncljy6ZYQVC3') {
          console.log(`📊 [DEALER ENDPOINT] Counting vehicle ${doc.id} for Luis (status: ${vehicle.status}) - total now: ${vehiclesBySeller[vehicle.sellerId]}`);
        }
      } else if (vehicle.assignedTo) {
        // Solo contar por assignedTo si no tiene sellerId
        const currentCount = vehiclesBySeller[vehicle.assignedTo] || 0;
        vehiclesBySeller[vehicle.assignedTo] = currentCount + 1;
        if (vehicle.assignedTo === '2SD4ppoXesfUxbZDncljy6ZYQVC3') {
          console.log(`📊 [DEALER ENDPOINT] Counting vehicle ${doc.id} for Luis via assignedTo (status: ${vehicle.status}) - total now: ${vehiclesBySeller[vehicle.assignedTo]}`);
        }
      } else {
        // Vehículo sin sellerId ni assignedTo
        console.log(`⚠️ [DEALER ENDPOINT] Vehicle ${doc.id} has no sellerId or assignedTo`);
      }
    });
    
    console.log(`📊 [DEALER ENDPOINT] Vehicles by seller (TOTAL, including sold):`, vehiclesBySeller);

    const sellers = sellersSnapshot.docs.map((doc: any) => {
      const sellerData = doc.data();
      const sellerId = doc.id;
      const vehiclesCount = vehiclesBySeller[sellerId] || 0;
      
      console.log(`👤 [DEALER ENDPOINT] Seller ${sellerData.name} (${sellerId}): ${vehiclesCount} vehicles`);
      
      return {
        id: sellerId,
        name: sellerData.name || 'Sin nombre',
        title: sellerData.title || sellerData.jobTitle || 'Vendedor',
        photo: sellerData.photo || sellerData.photoUrl || '',
        sellerRating: sellerData.sellerRating || 0,
        sellerRatingCount: sellerData.sellerRatingCount || 0,
        email: sellerData.email || '',
        phone: sellerData.phone || '',
        whatsapp: sellerData.whatsapp || sellerData.phone || '',
        vehiclesCount: vehiclesCount,
      };
    });
    
    console.log(`✅ Returning ${sellers.length} sellers with vehicle counts`);

    return NextResponse.json({
      dealer: {
        id: dealerDoc.id,
        name: dealerData.name || tenantData?.name || 'Dealer',
        companyName: tenantData?.companyName || tenantData?.name || 'Dealer',
        tenantId: tenantId,
        tenantName: tenantData?.name || 'Dealer',
        dealerRating: dealerData.dealerRating || 0,
        dealerRatingCount: dealerData.dealerRatingCount || 0,
        email: dealerData.email || tenantData?.email || '',
        phone: dealerData.phone || tenantData?.phone || '',
        whatsapp: dealerData.whatsapp || dealerData.phone || tenantData?.phone || '',
        website: dealerData.website || tenantData?.website || tenantData?.domain || '',
      },
      vehicles,
      sellers,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Error fetching dealer data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

