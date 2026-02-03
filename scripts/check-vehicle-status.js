// Script para ver el estado actual de los vehículos
// Ejecutar con: node scripts/check-vehicle-status.js

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Cargar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
  });
}

// Inicializar Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function checkVehicles() {
  console.log('\n🔍 Verificando estado de vehículos...\n');

  const tenantsSnapshot = await db.collection('tenants').get();
  
  let totalVehicles = 0;
  let statusCounts = {
    available: 0,
    sold: 0,
    reserved: 0,
    other: 0,
    missing: 0
  };
  
  let publishedCount = 0;
  let notPublishedCount = 0;

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const tenantData = tenantDoc.data();
    
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    if (vehiclesSnapshot.empty) continue;

    console.log(`\n📂 Tenant: ${tenantData.name || tenantId} (status: ${tenantData.status || 'N/A'})`);
    console.log(`   Vehículos: ${vehiclesSnapshot.size}\n`);

    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const data = vehicleDoc.data();
      totalVehicles++;
      
      const vehicleName = `${data.year || ''} ${data.make || ''} ${data.model || ''}`.trim();
      const status = data.status || 'missing';
      const published = data.publishedOnPublicPage === true;
      
      // Contar por status
      if (status === 'available') statusCounts.available++;
      else if (status === 'sold') statusCounts.sold++;
      else if (status === 'reserved') statusCounts.reserved++;
      else if (status === 'missing') statusCounts.missing++;
      else statusCounts.other++;
      
      // Contar publicados
      if (published) publishedCount++;
      else notPublishedCount++;
      
      console.log(`   📝 ${vehicleName || vehicleDoc.id}`);
      console.log(`      Status: ${status}`);
      console.log(`      PublishedOnPublicPage: ${data.publishedOnPublicPage === true ? '✅ true' : data.publishedOnPublicPage === false ? '❌ false' : '⚠️  undefined'}`);
      console.log(`      TenantId: ${data.tenantId || '⚠️  missing'}`);
    }
  }

  console.log('\n\n📊 RESUMEN COMPLETO:\n');
  console.log(`   Total de vehículos: ${totalVehicles}`);
  console.log(`\n   Por STATUS:`);
  console.log(`      ✅ available: ${statusCounts.available}`);
  console.log(`      🔒 reserved: ${statusCounts.reserved}`);
  console.log(`      💰 sold: ${statusCounts.sold}`);
  console.log(`      ❓ other: ${statusCounts.other}`);
  console.log(`      ⚠️  missing (sin status): ${statusCounts.missing}`);
  console.log(`\n   Por PUBLICACIÓN:`);
  console.log(`      ✅ Published (true): ${publishedCount}`);
  console.log(`      ❌ Not Published (false/undefined): ${notPublishedCount}`);
  
  console.log('\n💡 PARA QUE APAREZCAN EN LA PÁGINA PÚBLICA:');
  console.log(`   • El tenant debe tener status: 'active'`);
  console.log(`   • El vehículo debe tener status: 'available'`);
  console.log(`   • El vehículo debe tener publishedOnPublicPage: true\n`);
}

checkVehicles()
  .then(() => {
    console.log('✅ Diagnóstico completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });


