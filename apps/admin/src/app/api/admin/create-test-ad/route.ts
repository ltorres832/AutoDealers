import { NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET() {
  try {
    const advertiserId = '1zSal11IXoUD0QDt6uBwVCEexFD2';
    
    // Verificar anunciante
    const advertiserDoc = await db.collection('advertisers').doc(advertiserId).get();
    if (!advertiserDoc.exists) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }
    
    const advertiserData = advertiserDoc.data();
    const now = admin.firestore.Timestamp.now();
    const endDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
    
    const adRef = await db.collection('sponsored_content').add({
      advertiserId: advertiserId,
      advertiserName: advertiserData?.companyName || 'El Chulo',
      campaignName: 'Demo Pública',
      type: 'banner',
      placement: 'sponsors_section',
      title: 'Banner de Prueba',
      description: 'Este es un anuncio de prueba visible en la home.',
      imageUrl: 'https://via.placeholder.com/900x400?text=Demo+Ad',
      videoUrl: '',
      linkUrl: 'https://example.com',
      linkType: 'external',
      targetLocation: [],
      targetVehicleTypes: [],
      budget: 1,
      budgetType: 'total',
      price: 1,
      durationDays: 7,
      startDate: now,
      endDate: endDate,
      status: 'active',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: 'system'
    });
    
    return NextResponse.json({
      success: true,
      adId: adRef.id,
      message: 'Anuncio de prueba creado y activado. Debería verse en http://localhost:3000/'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
