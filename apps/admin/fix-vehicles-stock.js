// Script para agregar stockNumber a vehículos existentes
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
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value.trim();
      }
    }
  });
}

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

async function generateStockNumber(tenantId, existingNumbers = []) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  // Encontrar el número más alto del día
  let maxNumber = 0;
  existingNumbers.forEach((stockNumber) => {
    if (stockNumber && stockNumber.startsWith(`STK-${dateStr}-`)) {
      const numberPart = parseInt(stockNumber.split('-')[2] || '0');
      if (numberPart > maxNumber) {
        maxNumber = numberPart;
      }
    }
  });
  
  // Generar nuevo número (incrementar en 1)
  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `STK-${dateStr}-${nextNumber}`;
}

async function fixVehiclesStock() {
  console.log('🔧 CORRIGIENDO STOCK NUMBERS DE VEHÍCULOS EXISTENTES');
  console.log('='.repeat(60));
  
  try {
    const tenantsSnapshot = await db.collection('tenants').get();
    let totalFixed = 0;
    let totalSkipped = 0;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      console.log(`\n🏢 Tenant: ${tenantData.name || tenantId}`);
      
      // Obtener todos los vehículos del tenant
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();
      
      if (vehiclesSnapshot.size === 0) {
        console.log('   No hay vehículos');
        continue;
      }
      
      // Obtener todos los stockNumbers existentes para este tenant
      const existingStockNumbers = [];
      vehiclesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const stockNumber = data.stockNumber || data.specifications?.stockNumber;
        if (stockNumber) {
          existingStockNumbers.push(stockNumber);
        }
      });
      
      console.log(`   Vehículos encontrados: ${vehiclesSnapshot.size}`);
      console.log(`   Con stockNumber: ${existingStockNumbers.length}`);
      
      // Procesar cada vehículo
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        const vehicleData = vehicleDoc.data();
        const vehicleId = vehicleDoc.id;
        
        // Verificar si ya tiene stockNumber
        const existingStockNumber = vehicleData.stockNumber || vehicleData.specifications?.stockNumber;
        
        if (existingStockNumber) {
          console.log(`   ✅ ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Ya tiene: ${existingStockNumber}`);
          totalSkipped++;
          continue;
        }
        
        // Generar nuevo stockNumber
        const newStockNumber = await generateStockNumber(tenantId, existingStockNumbers);
        existingStockNumbers.push(newStockNumber);
        
        console.log(`   🔧 ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Agregando: ${newStockNumber}`);
        
        // Actualizar el vehículo
        const updateData = {
          stockNumber: newStockNumber,
          specifications: {
            ...vehicleData.specifications,
            stockNumber: newStockNumber,
          },
        };
        
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .doc(vehicleId)
          .update(updateData);
        
        totalFixed++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   Vehículos corregidos: ${totalFixed}`);
    console.log(`   Vehículos que ya tenían stockNumber: ${totalSkipped}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

fixVehiclesStock();

