/**
 * Script para actualizar el rol en todas las sesiones activas del usuario admin
 * Uso: node apps/admin/fix-session-role.js
 */

const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, 'apps', 'admin', '.env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=');
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key.includes('PRIVATE_KEY')) {
          value = value.replace(/\\n/g, '\n');
        }
        envVars[key.trim()] = value;
      }
    }
  });
}

Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

const admin = require('firebase-admin');

async function fixSessionRole() {
  try {
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    const auth = admin.auth();
    const db = admin.firestore();

    const email = 'admin@autodealers.com';
    console.log(`🔍 Buscando usuario: ${email}`);

    const user = await auth.getUserByEmail(email);
    console.log(`✅ Usuario encontrado: ${user.uid}`);

    // Obtener todas las sesiones activas del usuario
    const sessionsSnapshot = await db.collection('sessions')
      .where('userId', '==', user.uid)
      .get();

    console.log(`📋 Encontradas ${sessionsSnapshot.size} sesiones activas`);

    let updated = 0;
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data();
      console.log(`\n📝 Sesión ${sessionDoc.id}:`);
      console.log(`   Rol actual: ${sessionData.role || 'NO DEFINIDO'}`);
      
      if (sessionData.role !== 'admin') {
        await sessionDoc.ref.update({
          role: 'admin',
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ Rol actualizado a 'admin'`);
        updated++;
      } else {
        console.log(`   ✅ Rol ya es 'admin'`);
      }
    }

    // También asegurar que el documento de usuario tenga el rol correcto
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.role !== 'admin') {
        await userDoc.ref.update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`\n✅ Rol actualizado en documento de usuario`);
      }
    }

    // Actualizar custom claims
    await auth.setCustomUserClaims(user.uid, {
      role: 'admin',
    });
    console.log(`\n✅ Custom claims actualizados`);

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ SESIONES ACTUALIZADAS');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`📊 Resumen:`);
    console.log(`   - Sesiones encontradas: ${sessionsSnapshot.size}`);
    console.log(`   - Sesiones actualizadas: ${updated}`);
    console.log(`\n💡 IMPORTANTE:`);
    console.log(`   Cierra sesión y vuelve a iniciar sesión`);
    console.log(`   para que los cambios surtan efecto.\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixSessionRole().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

