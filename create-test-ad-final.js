// Script para crear anuncio de prueba directamente en Firestore
// Usar las funciones del core que ya manejan Firebase correctamente
const { getFirestore } = require('./packages/core/src/firebase');
const admin = require('firebase-admin');

const db = getFirestore();

async function createTestAd() {
  try {
    const advertiserId = '1zSal11IXoUD0QDt6uBwVCEexFD2';
    
    // Verificar anunciante
    const advertiserDoc = await db.collection('advertisers').doc(advertiserId).get();
    if (!advertiserDoc.exists) {
      console.error('❌ Anunciante no encontrado');
      process.exit(1);
    }
    
    const advertiserData = advertiserDoc.data();
    console.log('✅ Anunciante encontrado:', advertiserData.companyName);
    
    const now = admin.firestore.Timestamp.now();
    const endDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
    
    const adRef = await db.collection('sponsored_content').add({
      advertiserId: advertiserId,
      advertiserName: advertiserData.companyName || 'El Chulo',
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
    
    console.log('✅ Anuncio de prueba creado con ID:', adRef.id);
    console.log('📍 Debería verse en http://localhost:3000/');
    console.log('📊 Estado: active');
    console.log('📍 Placement: sponsors_section');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestAd();
