/**
 * Script para asignar sellerId a vehículos existentes
 * 
 * Uso:
 * node scripts/fix-seller-vehicles.js <tenantId> [sellerId]
 * 
 * Ejemplos:
 * - Asignar todos los vehículos sin sellerId de un tenant a un seller específico:
 *   node scripts/fix-seller-vehicles.js GaLJ3YeYHG3Xz4CuPa4K 2SD4ppoXesfUxbZDncljy6ZYQVC3
 * 
 * - Distribuir vehículos entre todos los sellers del tenant:
 *   node scripts/fix-seller-vehicles.js GaLJ3YeYHG3Xz4CuPa4K
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json no encontrado');
  console.error('Por favor, coloca el archivo serviceAccountKey.json en la raíz del proyecto');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixSellerVehicles(tenantId, sellerId = null) {
  try {
    console.log(`🔧 Fixing sellerId for vehicles in tenant ${tenantId}${sellerId ? ` for seller ${sellerId}` : ''}`);

    // Obtener todos los vehículos del tenant
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    console.log(`📦 Found ${vehiclesSnapshot.size} vehicles in tenant ${tenantId}`);

    if (vehiclesSnapshot.size === 0) {
      console.log('⚠️ No hay vehículos en este tenant');
      return;
    }

    // Obtener todos los sellers del tenant
    const sellersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'seller')
      .where('status', '==', 'active')
      .get();

    const sellers = sellersSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    console.log(`👥 Found ${sellers.length} active sellers in tenant:`, sellers.map(s => `${s.name} (${s.id})`));

    if (sellers.length === 0) {
      console.error('❌ No hay sellers activos en el tenant');
      return;
    }

    const results = {
      totalVehicles: vehiclesSnapshot.size,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (sellerId) {
      // Verificar que el seller existe
      const sellerDoc = await db.collection('users').doc(sellerId).get();
      if (!sellerDoc.exists) {
        console.error(`❌ Seller ${sellerId} no encontrado`);
        return;
      }
      const sellerName = sellerDoc.data().name;
      console.log(`📝 Assigning all vehicles without sellerId to seller ${sellerName} (${sellerId})`);

      for (const vehicleDoc of vehiclesSnapshot.docs) {
        try {
          const vehicleData = vehicleDoc.data();
          
          if (!vehicleData.sellerId && !vehicleData.assignedTo) {
            await vehicleDoc.ref.update({
              sellerId: sellerId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            results.updated++;
            console.log(`✅ Assigned vehicle ${vehicleDoc.id} (${vehicleData.make} ${vehicleData.model} ${vehicleData.year}) to seller ${sellerName}`);
          } else {
            results.skipped++;
            console.log(`⏭️ Skipped vehicle ${vehicleDoc.id} - already has sellerId: ${vehicleData.sellerId || vehicleData.assignedTo}`);
          }
        } catch (error) {
          results.errors.push(`Error updating vehicle ${vehicleDoc.id}: ${error.message}`);
          console.error(`❌ Error updating vehicle ${vehicleDoc.id}:`, error.message);
        }
      }
    } else {
      // Distribuir vehículos entre todos los sellers
      console.log(`📝 Distributing vehicles among ${sellers.length} sellers`);
      
      let sellerIndex = 0;
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        try {
          const vehicleData = vehicleDoc.data();
          
          if (!vehicleData.sellerId && !vehicleData.assignedTo) {
            const assignedSeller = sellers[sellerIndex % sellers.length];
            
            await vehicleDoc.ref.update({
              sellerId: assignedSeller.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            results.updated++;
            console.log(`✅ Assigned vehicle ${vehicleDoc.id} (${vehicleData.make} ${vehicleData.model} ${vehicleData.year}) to seller ${assignedSeller.name}`);
            sellerIndex++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push(`Error updating vehicle ${vehicleDoc.id}: ${error.message}`);
          console.error(`❌ Error updating vehicle ${vehicleDoc.id}:`, error.message);
        }
      }
    }

    console.log('\n📊 Results:');
    console.log(`   Total vehicles: ${results.totalVehicles}`);
    console.log(`   Updated: ${results.updated}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✅ Fix completed!');
  } catch (error) {
    console.error('❌ Error fixing seller vehicles:', error);
    process.exit(1);
  }
}

// Ejecutar script
const tenantId = process.argv[2];
const sellerId = process.argv[3] || null;

if (!tenantId) {
  console.error('❌ Uso: node scripts/fix-seller-vehicles.js <tenantId> [sellerId]');
  console.error('   Ejemplo: node scripts/fix-seller-vehicles.js GaLJ3YeYHG3Xz4CuPa4K 2SD4ppoXesfUxbZDncljy6ZYQVC3');
  process.exit(1);
}

fixSellerVehicles(tenantId, sellerId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


