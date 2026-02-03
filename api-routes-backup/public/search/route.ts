import { NextRequest, NextResponse } from 'next/server';

import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // 'all', 'seller', 'dealer'
    const limit = parseInt(searchParams.get('limit') || '100');

    // Si query es '*' o está vacío, obtener todos (para featured)
    const getAll = !query || query === '*' || query.length < 2;
    const searchTerm = getAll ? '' : query.toLowerCase().trim();
    const results: { sellers: any[]; dealers: any[] } = {
      sellers: [],
      dealers: [],
    };

    // Buscar sellers
    if (type === 'all' || type === 'seller') {
      const sellersSnapshot = await db
        .collection('users')
        .where('role', '==', 'seller')
        .where('status', '==', 'active')
        .get();

      for (const doc of sellersSnapshot.docs) {
        const sellerData = doc.data();
        const sellerName = (sellerData.name || '').toLowerCase();
        const sellerEmail = (sellerData.email || '').toLowerCase();

        if (getAll || sellerName.includes(searchTerm) || sellerEmail.includes(searchTerm)) {
          // Obtener tenant del seller
          const tenantId = sellerData.tenantId;
          let tenantName = 'Vendedor';
          let tenantData: any = null;

          if (tenantId) {
            const tenantDoc = await db.collection('tenants').doc(tenantId).get();
            if (tenantDoc.exists) {
              tenantData = tenantDoc.data();
              tenantName = tenantData?.name || 'Vendedor';
            }
          }

          // Contar vehículos publicados
          let publishedVehiclesCount = 0;
          if (tenantId) {
            const vehiclesSnapshot = await db
              .collection('tenants')
              .doc(tenantId)
              .collection('vehicles')
              .where('status', '==', 'available')
              .where('publishedOnPublicPage', '==', true)
              .get();
            publishedVehiclesCount = vehiclesSnapshot.size;
          }

          results.sellers.push({
            id: doc.id,
            name: sellerData.name || 'Sin nombre',
            email: sellerData.email || '',
            phone: sellerData.phone || '',
            photo: sellerData.photo || sellerData.photoUrl || '',
            sellerRating: sellerData.sellerRating || 0,
            sellerRatingCount: sellerData.sellerRatingCount || 0,
            tenantId: tenantId || '',
            tenantName: tenantName,
            publishedVehiclesCount,
            title: sellerData.title || sellerData.jobTitle || 'Vendedor',
          });
        }
      }
    }

    // Buscar dealers
    if (type === 'all' || type === 'dealer') {
      const dealersSnapshot = await db
        .collection('users')
        .where('role', '==', 'dealer')
        .where('status', '==', 'active')
        .get();

      for (const doc of dealersSnapshot.docs) {
        const dealerData = doc.data();
        const tenantId = dealerData.tenantId;

        if (!tenantId) continue;

        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) continue;

        const tenantData = tenantDoc.data();
        const tenantName = (tenantData?.name || '').toLowerCase();
        const companyName = (tenantData?.companyName || '').toLowerCase();
        const dealerName = (dealerData.name || '').toLowerCase();

        if (
          getAll ||
          tenantName.includes(searchTerm) ||
          companyName.includes(searchTerm) ||
          dealerName.includes(searchTerm)
        ) {
          // Contar vehículos publicados
          const vehiclesSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .where('status', '==', 'available')
            .where('publishedOnPublicPage', '==', true)
            .get();

          // Obtener sellers del dealer
          const sellersSnapshot = await db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .where('role', '==', 'seller')
            .where('status', '==', 'active')
            .get();

          const sellers = sellersSnapshot.docs.map((sellerDoc: any) => {
            const sellerData = sellerDoc.data();
            return {
              id: sellerDoc.id,
              name: sellerData.name || 'Sin nombre',
              title: sellerData.title || sellerData.jobTitle || 'Vendedor',
              photo: sellerData.photo || sellerData.photoUrl || '',
              sellerRating: sellerData.sellerRating || 0,
              sellerRatingCount: sellerData.sellerRatingCount || 0,
            };
          });

          results.dealers.push({
            id: doc.id,
            name: dealerData.name || tenantData?.name || 'Dealer',
            companyName: tenantData?.companyName || '',
            tenantId: tenantId,
            tenantName: tenantData?.name || 'Dealer',
            photo: dealerData.photo || dealerData.photoUrl || tenantData?.branding?.logo || '',
            location: dealerData.location || tenantData?.location || '',
            dealerRating: dealerData.dealerRating || 0,
            dealerRatingCount: dealerData.dealerRatingCount || 0,
            publishedVehiclesCount: vehiclesSnapshot.size,
            sellersCount: sellers.length,
            sellers,
          });
        }
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

