// Script de diagnóstico para verificar vehículos en Firestore
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente
const envPath = path.join(__dirname, '.env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=');
        // Manejar valores entre comillas
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value.trim();
      }
    }
  });
}

// Parsear FIREBASE_PRIVATE_KEY manualmente (puede tener saltos de línea)
if (envVars.FIREBASE_PRIVATE_KEY) {
  envVars.FIREBASE_PRIVATE_KEY = envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

// Inicializar Firebase Admin
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envVars.FIREBASE_PROJECT_ID,
        clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
        privateKey: envVars.FIREBASE_PRIVATE_KEY,
      }),
      storageBucket: envVars.FIREBASE_STORAGE_BUCKET || 'autodealers-7f62e.firebasestorage.app',
    });
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function diagnoseVehicles() {
  console.log('🔍 DIAGNÓSTICO DE VEHÍCULOS');
  console.log('='.repeat(60));
  
  try {
    // Obtener todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    console.log(`\n📋 Encontrados ${tenantsSnapshot.size} tenants\n`);
    
    let totalVehicles = 0;
    let vehiclesWithStockNumber = 0;
    let vehiclesWithPhotos = 0;
    let vehiclesPublished = 0;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      console.log(`\n🏢 Tenant: ${tenantData.name || tenantId}`);
      console.log('-'.repeat(60));
      
      // Obtener vehículos del tenant
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();
      
      console.log(`   Vehículos encontrados: ${vehiclesSnapshot.size}`);
      
      if (vehiclesSnapshot.size === 0) {
        continue;
      }
      
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        totalVehicles++;
        const vehicleData = vehicleDoc.data();
        const vehicleId = vehicleDoc.id;
        
        // Verificar stockNumber
        const stockNumber = vehicleData.stockNumber || vehicleData.specifications?.stockNumber;
        const hasStockNumber = !!stockNumber;
        if (hasStockNumber) vehiclesWithStockNumber++;
        
        // Verificar fotos
        const photos = vehicleData.photos || [];
        const validPhotos = photos.filter(p => p && typeof p === 'string' && p.trim() !== '');
        const hasPhotos = validPhotos.length > 0;
        if (hasPhotos) vehiclesWithPhotos++;
        
        // Verificar publicación
        const isPublished = vehicleData.publishedOnPublicPage === true;
        if (isPublished) vehiclesPublished++;
        
        console.log(`\n   🚗 ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} (${vehicleId})`);
        console.log(`      Stock Number: ${stockNumber || '❌ NO TIENE'}`);
        console.log(`      Fotos: ${validPhotos.length} válidas de ${photos.length} totales`);
        if (validPhotos.length > 0) {
          console.log(`      Primera foto: ${validPhotos[0].substring(0, 80)}...`);
        }
        console.log(`      Publicado: ${isPublished ? '✅ SÍ' : '❌ NO'}`);
        console.log(`      Status: ${vehicleData.status || 'N/A'}`);
        
        // Verificar estructura de datos
        console.log(`      Estructura:`);
        console.log(`        - stockNumber (nivel superior): ${vehicleData.stockNumber ? '✅' : '❌'}`);
        console.log(`        - specifications.stockNumber: ${vehicleData.specifications?.stockNumber ? '✅' : '❌'}`);
        console.log(`        - photos (array): ${Array.isArray(photos) ? '✅' : '❌'}`);
        console.log(`        - publishedOnPublicPage: ${vehicleData.publishedOnPublicPage !== undefined ? '✅' : '❌'}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   Total de vehículos: ${totalVehicles}`);
    console.log(`   Con Stock Number: ${vehiclesWithStockNumber} (${((vehiclesWithStockNumber/totalVehicles)*100).toFixed(1)}%)`);
    console.log(`   Con Fotos: ${vehiclesWithPhotos} (${((vehiclesWithPhotos/totalVehicles)*100).toFixed(1)}%)`);
    console.log(`   Publicados: ${vehiclesPublished} (${((vehiclesPublished/totalVehicles)*100).toFixed(1)}%)`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

diagnoseVehicles();

