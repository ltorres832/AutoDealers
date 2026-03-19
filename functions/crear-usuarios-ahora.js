// Script para crear usuarios - Usa Application Default Credentials de Firebase CLI
const admin = require('firebase-admin');

console.log('Inicializando Firebase Admin...');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'autodealers-7f62e'
    });
    console.log('✅ Firebase Admin inicializado');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
    console.log('\n💡 Ejecuta: firebase login');
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

const users = [
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

async function createUsers() {
  console.log('\n========================================');
  console.log('  CREANDO USUARIOS DE PRUEBA');
  console.log('========================================\n');

  const results = [];

  for (const userData of users) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        console.log(`⚠️  Usuario ${userData.email} ya existe, actualizando...`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.name,
          });
          console.log(`✅ Usuario ${userData.email} creado en Auth`);
        } else {
          throw error;
        }
      }

      const userDoc = {
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
      };

      await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });

      results.push({
        email: userData.email,
        role: userData.role,
        status: 'created',
        uid: userRecord.uid,
      });
      
      console.log(`✅ Usuario creado: ${userData.email} (${userData.role}) - UID: ${userRecord.uid}`);
    } catch (error) {
      console.error(`❌ Error al crear usuario ${userData.email}:`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      results.push({
        email: userData.email,
        role: userData.role,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log('\n========================================');
  console.log('  RESULTADOS');
  console.log('========================================\n');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n✅ Proceso completado');
  
  return { success: true, users: results };
}

createUsers()
  .then(() => {
    console.log('\n✅ Todos los usuarios creados exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });


