const { getFirestore } = require('./packages/core/src/firebase');
const admin = require('firebase-admin');

async function createAd() {
  try {
    const db = getFirestore();
    const now = admin.firestore.Timestamp.now();
    const endDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
    
    const adRef = await db.collection('sponsored_content').add({
      advertiserId: '1zSal11IXoUD0QDt6uBwVCEexFD2',
      advertiserName: 'El Chulo',
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
    
    console.log('✅ Anuncio creado con ID:', adRef.id);
    console.log('Debería verse en http://localhost:3000/');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAd();
