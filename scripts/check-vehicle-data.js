const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkVehicle() {
  const tenantId = '4LhImm05bJXLxedYPEmD';
  const vehicleId = '053N9StX4vasAAOIalQK';
  
  try {
    console.log(`\n🔍 Verificando vehículo: ${tenantId}/${vehicleId}\n`);
    
    const vehicleDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .get();
    
    if (!vehicleDoc.exists) {
      console.log('❌ Vehículo no existe en Firestore');
      return;
    }
    
    const vehicleData = vehicleDoc.data();
    
    console.log('📋 DATOS DEL VEHÍCULO:');
    console.log('   ID:', vehicleDoc.id);
    console.log('   Make:', vehicleData.make);
    console.log('   Model:', vehicleData.model);
    console.log('   Year:', vehicleData.year);
    console.log('   Price:', vehicleData.price);
    console.log('   Currency:', vehicleData.currency);
    console.log('   Description:', vehicleData.description ? vehicleData.description.substring(0, 100) + '...' : 'NO TIENE');
    console.log('   PublishedOnPublicPage:', vehicleData.publishedOnPublicPage);
    console.log('   Status:', vehicleData.status);
    console.log('   Photos:', vehicleData.photos?.length || 0);
    
    if (vehicleData.photos && vehicleData.photos.length > 0) {
      console.log('\n📸 URLs DE FOTOS:');
      vehicleData.photos.forEach((photo, index) => {
        console.log(`   ${index + 1}. ${photo}`);
      });
    } else {
      console.log('\n⚠️ NO HAY FOTOS');
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkVehicle().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


