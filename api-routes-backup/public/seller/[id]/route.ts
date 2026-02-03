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
    const sellerId = params.id;

    // Obtener información del seller
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.role !== 'seller' || sellerData?.status !== 'active') {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const tenantId = sellerData.tenantId;
    let tenantName = 'Vendedor';
    if (tenantId) {
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (tenantDoc.exists) {
        tenantName = tenantDoc.data()?.name || 'Vendedor';
      }
    }

    // Obtener vehículos publicados del seller
    const vehicles: any[] = [];
    if (tenantId) {
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .where('status', '==', 'available')
        .where('publishedOnPublicPage', '==', true)
        .get();

      for (const doc of vehiclesSnapshot.docs) {
        const vehicleData = doc.data();
        vehicles.push({
          id: doc.id,
          ...vehicleData,
        });
      }
    }

    // Obtener datos del tenant para website
    let website = sellerData.website || '';
    if (tenantId && !website) {
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        website = tenantData?.website || tenantData?.domain || '';
      }
    }

    return NextResponse.json({
      seller: {
        id: sellerDoc.id,
        name: sellerData.name || 'Sin nombre',
        email: sellerData.email || '',
        phone: sellerData.phone || '',
        whatsapp: sellerData.whatsapp || sellerData.phone || '', // Fallback a phone si no hay whatsapp
        website: website,
        photo: sellerData.photo || sellerData.photoUrl || '',
        sellerRating: sellerData.sellerRating || 0,
        sellerRatingCount: sellerData.sellerRatingCount || 0,
        tenantId: tenantId || '',
        tenantName: tenantName,
        title: sellerData.title || sellerData.jobTitle || 'Vendedor',
      },
      vehicles,
    });
  } catch (error: any) {
    console.error('Error fetching seller data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

