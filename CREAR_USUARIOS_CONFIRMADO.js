// Script para crear usuarios - Ejecutar desde functions/
const fs = require('fs');
const admin = require('firebase-admin');

const logFile = './usuarios_creados.log';
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFile, logMsg);
};

log('🚀 Iniciando creación de usuarios...\n');

// Inicializar con projectId explícito
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'autodealers-7f62e'
    });
  }
  console.log('✅ Firebase Admin inicializado\n');
} catch (error) {
  console.error('❌ Error inicializando:', error.message);
  console.log('\n💡 Ejecuta: firebase login');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

const users = [
  { email: 'admin@autodealers.test', password: 'Admin123!', role: 'admin', name: 'Admin Usuario', tenantId: null, membershipId: 'admin-membership', membershipType: 'dealer', status: 'active' },
  { email: 'dealer@autodealers.test', password: 'Dealer123!', role: 'dealer', name: 'Dealer Usuario', tenantId: 'test-tenant-1', membershipId: 'dealer-membership', membershipType: 'dealer', status: 'active' },
  { email: 'seller@autodealers.test', password: 'Seller123!', role: 'seller', name: 'Seller Usuario', tenantId: 'test-tenant-1', membershipId: 'seller-membership', membershipType: 'seller', status: 'active' },
  { email: 'advertiser@autodealers.test', password: 'Advertiser123!', role: 'advertiser', name: 'Advertiser Usuario', tenantId: null, membershipId: 'advertiser-membership', membershipType: 'dealer', status: 'active' },
];

(async () => {
  log('========================================');
  log('  CREANDO USUARIOS DE PRUEBA');
  log('========================================\n');
  
  for (const u of users) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(u.email);
        log(`⚠️  ${u.email} ya existe en Auth`);
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: u.email,
            password: u.password,
            displayName: u.name
          });
          log(`✅ ${u.email} creado en Auth`);
        } else {
          throw e;
        }
      }
      
      const userDoc = {
        id: userRecord.uid,
        email: u.email,
        name: u.name,
        role: u.role,
        tenantId: u.tenantId,
        membershipId: u.membershipId,
        membershipType: u.membershipType,
        status: u.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
      log(`✅ ${u.email} (${u.role}) - UID: ${userRecord.uid}\n`);
    } catch (e) {
      log(`❌ Error con ${u.email}: ${e.message}`);
      if (e.stack) log(e.stack);
      log('');
    }
  }
  
  log('========================================');
  log('  ✅ PROCESO COMPLETADO');
  log('========================================\n');
  process.exit(0);
})().catch(e => {
  log(`\n❌ Error fatal: ${e.message}`);
  if (e.stack) log(e.stack);
  process.exit(1);
});


