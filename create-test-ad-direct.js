const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
try {
  const serviceAccount = require(path.join(__dirname, 'apps/admin/.env.local'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
} catch (e) {
  // Intentar con variables de entorno
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

const db = admin.firestore();

async function createTestAd() {
  try {
    const advertiserId = '1zSal11IXoUD0QDt6uBwVCEexFD2';
    
    // Verificar que el anunciante existe
    const advertiserDoc = await db.collection('advertisers').doc(advertiserId).get();
    if (!advertiserDoc.exists) {
      console.error('Anunciante no encontrado:', advertiserId);
      process.exit(1);
    }
    
    const advertiserData = advertiserDoc.data();
    console.log('Anunciante encontrado:', advertiserData.companyName);
    
    // Crear anuncio de prueba
    const now = admin.firestore.Timestamp.now();
    const startDate = now;
    const endDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000); // 7 días
    
    const adData = {
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
      startDate: startDate,
      endDate: endDate,
      status: 'active', // Activo para que se vea
      impressions: 0,
      clicks: 0,
      conversions: 0,
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: 'system',
    };
    
    const adRef = await db.collection('sponsored_content').add(adData);
    console.log('✅ Anuncio de prueba creado con ID:', adRef.id);
    console.log('Debería verse en http://localhost:3000/');
    console.log('Estado: active');
    console.log('Placement: sponsors_section');
    console.log('Fechas:', startDate.toDate().toISOString(), 'a', endDate.toDate().toISOString());
    
    process.exit(0);
  } catch (error) {
    console.error('Error creando anuncio:', error);
    process.exit(1);
  }
}

createTestAd();
