const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar credenciales desde .env.local (mismo método que firebase.ts)
const envPath = path.join(__dirname, '.env.local');
let projectId, clientEmail, privateKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let currentKey = null;
  let currentValue = '';
  let inMultiline = false;
  let quoteChar = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Saltar comentarios
    if (trimmed.startsWith('#')) continue;
    
    // Buscar línea con =
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0 && !inMultiline) {
      // Guardar variable anterior
      if (currentKey && currentValue) {
        const finalValue = currentValue.trim();
        if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
        if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
        if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
      }
      
      // Nueva variable
      currentKey = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      // Verificar si comienza con comillas (multilínea)
      if ((value.startsWith('"') && !value.endsWith('"')) || 
          (value.startsWith("'") && !value.endsWith("'"))) {
        inMultiline = true;
        quoteChar = value[0];
        currentValue = value.substring(1);
      } else {
        // Valor simple
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        currentValue = value;
        if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = currentValue;
        if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = currentValue;
        if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = currentValue;
        currentKey = null;
        currentValue = '';
      }
    } else if (inMultiline) {
      // Continuación de valor multilínea
      if (trimmed.endsWith(quoteChar) && trimmed.length > 1) {
        currentValue += '\n' + trimmed.slice(0, -1);
        if (currentKey) {
          const finalValue = currentValue.trim();
          if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
          if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
          if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
        }
        currentKey = null;
        currentValue = '';
        inMultiline = false;
        quoteChar = null;
      } else {
        currentValue += '\n' + line;
      }
    }
  }
  
  // Guardar última variable
  if (currentKey && currentValue) {
    const finalValue = currentValue.trim();
    if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
    if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
    if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
  }
}

// Procesar privateKey
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Error: Credenciales de Firebase no encontradas en .env.local');
  console.error('   Buscando en:', envPath);
  process.exit(1);
}

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: 'autodealers-7f62e.firebasestorage.app',
  });
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.log('✅ Firebase Admin ya estaba inicializado');
  } else {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkVehicles() {
  console.log('\n🔍 Verificando vehículos en Firestore...\n');
  
  try {
    // Obtener todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    console.log(`📊 Encontrados ${tenantsSnapshot.size} tenants\n`);
    
    let totalVehicles = 0;
    let vehiclesWithPhotos = 0;
    let vehiclesWithoutPhotos = 0;
    let vehiclesPublished = 0;
    const vehiclesWithoutPhotosList = [];
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      console.log(`\n🏢 Tenant: ${tenantData.name || tenantId}`);
      
      // Obtener vehículos del tenant
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();
      
      console.log(`   📦 Vehículos: ${vehiclesSnapshot.size}`);
      
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        totalVehicles++;
        const vehicleData = vehicleDoc.data();
        const photos = vehicleData.photos || [];
        const published = vehicleData.publishedOnPublicPage === true;
        
        if (published) {
          vehiclesPublished++;
        }
        
        if (photos.length > 0) {
          vehiclesWithPhotos++;
          console.log(`   ✅ ${vehicleData.make} ${vehicleData.model} (${vehicleData.year}) - ${photos.length} foto(s)`);
          console.log(`      📸 Primera foto: ${photos[0]}`);
          if (published) {
            console.log(`      🌐 Publicado en página pública`);
          }
        } else {
          vehiclesWithoutPhotos++;
          const vehicleInfo = `${vehicleData.make} ${vehicleData.model} (${vehicleData.year}) - ID: ${vehicleDoc.id}`;
          vehiclesWithoutPhotosList.push({ tenantId, vehicleId: vehicleDoc.id, info: vehicleInfo });
          console.log(`   ⚠️  ${vehicleInfo} - SIN FOTOS`);
          if (published) {
            console.log(`      🌐 Publicado en página pública (pero sin fotos)`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log('='.repeat(60));
    console.log(`Total de vehículos: ${totalVehicles}`);
    console.log(`Vehículos con fotos: ${vehiclesWithPhotos}`);
    console.log(`Vehículos sin fotos: ${vehiclesWithoutPhotos}`);
    console.log(`Vehículos publicados: ${vehiclesPublished}`);
    console.log('='.repeat(60));
    
    if (vehiclesWithoutPhotos > 0) {
      console.log('\n⚠️  PROBLEMA ENCONTRADO:');
      console.log(`   ${vehiclesWithoutPhotos} vehículo(s) no tienen fotos guardadas en Firestore.`);
      console.log('\n   Vehículos sin fotos:');
      vehiclesWithoutPhotosList.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.info}`);
        console.log(`      Tenant: ${v.tenantId}, Vehicle ID: ${v.vehicleId}`);
      });
      console.log('\n   Esto puede deberse a:');
      console.log('   1. Las fotos no se subieron correctamente a Storage');
      console.log('   2. Las URLs no se guardaron en Firestore después de subir');
      console.log('   3. Error en la actualización del vehículo');
    }
    
  } catch (error) {
    console.error('❌ Error verificando vehículos:', error);
  }
  
  process.exit(0);
}

checkVehicles();
