// Crear anuncio de prueba usando las funciones del core
const path = require('path');

// Configurar el entorno para que Firebase se inicialice correctamente
process.chdir(path.join(__dirname, 'apps/admin'));

// Cargar variables de entorno manualmente
const fs = require('fs');
const envPath = path.join(__dirname, 'apps/admin/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Ahora importar y usar las funciones del core
const { getFirestore } = require('../../packages/core/src/firebase');
const admin = require('firebase-admin');

async function createAd() {
  try {
    console.log('Inicializando Firebase...');
    const db = getFirestore();
    
    const advertiserId = '1zSal11IXoUD0QDt6uBwVCEexFD2';
    
    // Verificar anunciante
    const advertiserDoc = await db.collection('advertisers').doc(advertiserId).get();
    if (!advertiserDoc.exists) {
      console.error('❌ Anunciante no encontrado');
      process.exit(1);
    }
    
    const advertiserData = advertiserDoc.data();
    console.log('✅ Anunciante encontrado:', advertiserData?.companyName);
    
    const now = admin.firestore.Timestamp.now();
    const endDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
    
    console.log('Creando anuncio...');
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
    
    console.log('✅ Anuncio creado con ID:', adRef.id);
    console.log('📍 Debería verse en http://localhost:3000/');
    console.log('📊 Estado: active');
    console.log('📍 Placement: sponsors_section');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createAd();
