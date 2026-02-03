// Script para verificar y corregir el dealerId de un seller
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    // Intentar usar las credenciales de aplicación por defecto
    admin.initializeApp();
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
    console.error('Asegúrate de tener las credenciales de Firebase configuradas');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkSellerDealer() {
  try {
    console.log('🔍 Buscando sellers y sus dealers asignados...\n');

    // Buscar todos los sellers
    const sellersSnapshot = await db.collection('users')
      .where('role', '==', 'seller')
      .get();

    console.log(`📊 Total sellers encontrados: ${sellersSnapshot.size}\n`);

    for (const sellerDoc of sellersSnapshot.docs) {
      const sellerData = sellerDoc.data();
      console.log(`\n👤 Seller: ${sellerData.name || sellerData.email}`);
      console.log(`   ID: ${sellerDoc.id}`);
      console.log(`   Email: ${sellerData.email}`);
      console.log(`   TenantId: ${sellerData.tenantId || 'N/A'}`);
      console.log(`   DealerId: ${sellerData.dealerId || 'NO ASIGNADO'}`);

      if (sellerData.dealerId) {
        // Verificar que el dealer existe
        const dealerTenantDoc = await db.collection('tenants').doc(sellerData.dealerId).get();
        
        if (dealerTenantDoc.exists) {
          const dealerTenantData = dealerTenantDoc.data();
          console.log(`   ✅ Dealer encontrado: ${dealerTenantData.name || sellerData.dealerId}`);
          
          // Buscar usuario dealer
          const dealerUsersSnapshot = await db.collection('users')
            .where('tenantId', '==', sellerData.dealerId)
            .where('role', '==', 'dealer')
            .limit(1)
            .get();
          
          if (!dealerUsersSnapshot.empty) {
            const dealerUser = dealerUsersSnapshot.docs[0].data();
            console.log(`   👔 Usuario dealer: ${dealerUser.name || dealerUser.email}`);
          } else {
            console.log(`   ⚠️ No se encontró usuario dealer en el tenant`);
          }
        } else {
          console.log(`   ❌ ERROR: El tenant del dealer NO EXISTE: ${sellerData.dealerId}`);
        }
      } else {
        console.log(`   ⚠️ Este seller NO tiene dealer asignado`);
      }
    }

    // Buscar el dealer "el chulo 3"
    console.log('\n\n🔍 Buscando dealer "el chulo 3"...\n');
    
    // Buscar en tenants por nombre
    const tenantsSnapshot = await db.collection('tenants').get();
    let chulo3Tenant = null;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantData = tenantDoc.data();
      if (tenantData.name && tenantData.name.toLowerCase().includes('chulo')) {
        console.log(`📋 Tenant encontrado: ${tenantData.name} (ID: ${tenantDoc.id})`);
        if (tenantData.name.toLowerCase().includes('chulo 3') || tenantData.name.toLowerCase().includes('chulo3')) {
          chulo3Tenant = { id: tenantDoc.id, ...tenantData };
        }
      }
    }

    if (chulo3Tenant) {
      console.log(`\n✅ Dealer "el chulo 3" encontrado:`);
      console.log(`   Tenant ID: ${chulo3Tenant.id}`);
      console.log(`   Nombre: ${chulo3Tenant.name}`);
      
      // Buscar usuarios dealer en este tenant
      const dealerUsersSnapshot = await db.collection('users')
        .where('tenantId', '==', chulo3Tenant.id)
        .where('role', '==', 'dealer')
        .get();
      
      console.log(`\n👔 Usuarios dealer en este tenant: ${dealerUsersSnapshot.size}`);
      dealerUsersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        console.log(`   - ${userData.name || userData.email} (ID: ${doc.id})`);
      });

      // Buscar sellers que deberían tener este dealer asignado
      console.log(`\n🔍 Buscando sellers que deberían tener este dealer asignado...`);
      const sellersWithThisDealer = await db.collection('users')
        .where('role', '==', 'seller')
        .where('dealerId', '==', chulo3Tenant.id)
        .get();
      
      console.log(`   Sellers con este dealerId: ${sellersWithThisDealer.size}`);
      sellersWithThisDealer.docs.forEach(doc => {
        const sellerData = doc.data();
        console.log(`   - ${sellerData.name || sellerData.email} (ID: ${doc.id})`);
      });
    } else {
      console.log(`\n❌ No se encontró dealer "el chulo 3"`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSellerDealer().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

