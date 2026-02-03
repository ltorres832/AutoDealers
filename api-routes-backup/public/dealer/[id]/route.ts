import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

export async function generateStaticParams() {
  return [];
}

const db = getFirestore();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealerId = params.id;

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

    // Obtener vehículos publicados del dealer
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .where('status', '==', 'available')
      .where('publishedOnPublicPage', '==', true)
      .get();

    const vehicles = vehiclesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener sellers del dealer
    const sellersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'seller')
      .where('status', '==', 'active')
      .get();

    const sellers = sellersSnapshot.docs.map((doc: any) => {
      const sellerData = doc.data();
      return {
        id: doc.id,
        name: sellerData.name || 'Sin nombre',
        title: sellerData.title || sellerData.jobTitle || 'Vendedor',
        photo: sellerData.photo || sellerData.photoUrl || '',
        sellerRating: sellerData.sellerRating || 0,
        sellerRatingCount: sellerData.sellerRatingCount || 0,
      };
    });

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
      sellers: sellers.map((seller: any) => {
        const sellerDocData = sellersSnapshot.docs.find((d: any) => d.id === seller.id)?.data();
        return {
          ...seller,
          email: sellerDocData?.email || '',
          phone: sellerDocData?.phone || '',
          whatsapp: sellerDocData?.whatsapp || sellerDocData?.phone || '',
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching dealer data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

