// Script para crear anuncio directamente usando Firebase Admin
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, 'apps/admin/.env.local');
let projectId, clientEmail, privateKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let currentKey = null;
  let currentValue = '';
  let inMultiline = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    
    if (inMultiline) {
      if (trimmed.endsWith('"') || trimmed.endsWith("'")) {
        currentValue += '\n' + trimmed.slice(0, -1);
        if (currentKey === 'FIREBASE_PROJECT_ID') projectId = currentValue;
        if (currentKey === 'FIREBASE_CLIENT_EMAIL') clientEmail = currentValue;
        if (currentKey === 'FIREBASE_PRIVATE_KEY') privateKey = currentValue;
        inMultiline = false;
        currentKey = null;
        currentValue = '';
      } else {
        currentValue += '\n' + trimmed;
      }
      continue;
    }
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      currentKey = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      if ((value.startsWith('"') && !value.endsWith('"')) || 
          (value.startsWith("'") && !value.endsWith("'"))) {
        inMultiline = true;
        currentValue = value.slice(1);
        continue;
      }
      
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      
      if (currentKey === 'FIREBASE_PROJECT_ID') projectId = value;
      if (currentKey === 'FIREBASE_CLIENT_EMAIL') clientEmail = value;
      if (currentKey === 'FIREBASE_PRIVATE_KEY') privateKey = value;
    }
  }
}

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ No se encontraron las credenciales de Firebase en apps/admin/.env.local');
  process.exit(1);
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function createAd() {
  try {
    const advertiserId = '1zSal11IXoUD0QDt6uBwVCEexFD2';
    
    console.log('Verificando anunciante...');
    const advertiserDoc = await db.collection('advertisers').doc(advertiserId).get();
    if (!advertiserDoc.exists) {
      console.error('❌ Anunciante no encontrado:', advertiserId);
      process.exit(1);
    }
    
    const advertiserData = advertiserDoc.data();
    console.log('✅ Anunciante encontrado:', advertiserData?.companyName);
    
    const now = admin.firestore.Timestamp.now();
    const endDate = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
    
    console.log('Creando anuncio de prueba...');
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
    
    console.log('');
    console.log('✅ Anuncio de prueba creado exitosamente!');
    console.log('📋 ID del anuncio:', adRef.id);
    console.log('📍 Debería verse en: http://localhost:3000/');
    console.log('📊 Estado: active');
    console.log('📍 Placement: sponsors_section');
    console.log('📅 Fechas:', now.toDate().toISOString(), 'a', endDate.toDate().toISOString());
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createAd();
