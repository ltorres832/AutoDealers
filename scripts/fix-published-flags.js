// Script para actualizar vehículos existentes agregando el campo publishedOnPublicPage
// Ejecutar con: node scripts/fix-published-flags.js

const admin = require('firebase-admin');
const path = require('path');

// Cargar variables de entorno desde el archivo .env.local en la raíz
const fs = require('fs');
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
        process.env[key.trim()] = value;
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

async function fixPublishedFlags() {
  try {
    console.log('\n🔧 Iniciando actualización de campos...\n');

    // 1. Obtener todos los tenants
    console.log('📝 Buscando tenants...');
    const tenantsSnapshot = await db.collection('tenants').get();
    
    if (tenantsSnapshot.empty) {
      console.log('⚠️  No se encontraron tenants en la base de datos.');
      return;
    }

    console.log(`✅ Encontrados ${tenantsSnapshot.size} tenants\n`);

    let totalVehicles = 0;
    let updatedVehicles = 0;
    let totalTenants = 0;
    let updatedTenants = 0;

    // 2. Actualizar tenants si les falta status
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      totalTenants++;

      console.log(`\n📂 Procesando tenant: ${tenantData.name || tenantId}`);

      // Actualizar tenant si no tiene status active
      if (!tenantData.status || tenantData.status !== 'active') {
        await db.collection('tenants').doc(tenantId).update({
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ Tenant actualizado con status: active`);
        updatedTenants++;
      }

      // 3. Buscar vehículos de este tenant
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();

      if (vehiclesSnapshot.empty) {
        console.log(`   ⚠️  No hay vehículos en este tenant`);
        continue;
      }

      console.log(`   📝 Encontrados ${vehiclesSnapshot.size} vehículos`);

      // 4. Actualizar cada vehículo
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        const vehicleId = vehicleDoc.id;
        const vehicleData = vehicleDoc.data();
        totalVehicles++;

        const updates = {};
        let needsUpdate = false;

        // Agregar publishedOnPublicPage si no existe
        if (vehicleData.publishedOnPublicPage === undefined) {
          updates.publishedOnPublicPage = true;
          needsUpdate = true;
        }

        // Asegurar que tenga status
        if (!vehicleData.status) {
          updates.status = 'available';
          needsUpdate = true;
        }

        // Agregar tenantId si no existe
        if (!vehicleData.tenantId) {
          updates.tenantId = tenantId;
          needsUpdate = true;
        }

        // Agregar tenantName si no existe
        if (!vehicleData.tenantName && tenantData.name) {
          updates.tenantName = tenantData.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          
          await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .update(updates);
          
          updatedVehicles++;
          const vehicleName = `${vehicleData.year || ''} ${vehicleData.make || ''} ${vehicleData.model || ''}`.trim();
          console.log(`   ✅ Actualizado: ${vehicleName || vehicleId}`);
        }
      }
    }

    console.log('\n✅ ¡Actualización completada!\n');
    console.log('📊 Resumen:');
    console.log(`   - Tenants encontrados: ${totalTenants}`);
    console.log(`   - Tenants actualizados: ${updatedTenants}`);
    console.log(`   - Vehículos encontrados: ${totalVehicles}`);
    console.log(`   - Vehículos actualizados: ${updatedVehicles}`);
    
    if (updatedVehicles > 0 || updatedTenants > 0) {
      console.log('\n🎉 Ahora recarga la página web y haz clic en "🐛 DEBUG" para verificar.\n');
    } else {
      console.log('\n⚠️  No se encontraron datos que actualizar.');
      console.log('   Los datos ya tienen los campos correctos, o no hay vehículos en la BD.\n');
    }

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    process.exit(1);
  }
}

// Ejecutar
fixPublishedFlags()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });


