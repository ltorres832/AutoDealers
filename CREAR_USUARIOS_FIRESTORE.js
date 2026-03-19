// Script para crear usuarios de prueba directamente en Firestore
// Ejecutar en Firebase Console > Firestore > Data > Scripts

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function createTestUsers() {
  const users = [
    // Admin User
    {
      email: 'admin@autodealers.test',
      password: 'Admin123!',
      role: 'admin',
      name: 'Admin Usuario',
      tenantId: null,
      membershipId: 'admin-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    // Dealer User
    {
      email: 'dealer@autodealers.test',
      password: 'Dealer123!',
      role: 'dealer',
      name: 'Dealer Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'dealer-membership',
      membershipType: 'dealer',
      status: 'active',
    },
    // Seller User
    {
      email: 'seller@autodealers.test',
      password: 'Seller123!',
      role: 'seller',
      name: 'Seller Usuario',
      tenantId: 'test-tenant-1',
      membershipId: 'seller-membership',
      membershipType: 'seller',
      status: 'active',
    },
    // Advertiser User
    {
      email: 'advertiser@autodealers.test',
      password: 'Advertiser123!',
      role: 'advertiser',
      name: 'Advertiser Usuario',
      tenantId: null,
      membershipId: 'advertiser-membership',
      membershipType: 'dealer',
      status: 'active',
    },
  ];

  const results = [];

  for (const userData of users) {
    try {
      // Verificar si el usuario ya existe
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        console.log(`Usuario ${userData.email} ya existe, actualizando...`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Crear usuario en Firebase Auth
          userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.name,
          });
          console.log(`Usuario ${userData.email} creado en Auth`);
        } else {
          throw error;
        }
      }

      // Crear o actualizar documento en Firestore
      await db.collection('users').doc(userRecord.uid).set({
        id: userRecord.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenantId: userData.tenantId,
        membershipId: userData.membershipId,
        membershipType: userData.membershipType,
        status: userData.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      results.push({
        email: userData.email,
        role: userData.role,
        status: 'created',
        uid: userRecord.uid,
      });
      
      console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Error al crear usuario ${userData.email}:`, error);
      results.push({
        email: userData.email,
        role: userData.role,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log('\n✅ Proceso completado');
  console.log('Resultados:', JSON.stringify(results, null, 2));
  
  return {
    success: true,
    users: results,
    message: 'Usuarios de prueba creados',
  };
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { createTestUsers };


