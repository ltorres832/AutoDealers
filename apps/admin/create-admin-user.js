/**
 * Script para crear el usuario admin en Firebase Auth
 * Ejecutar: node apps/admin/create-admin-user.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Cargar variables de entorno desde .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    let currentKey = null;
    let currentValue = '';
    let inQuotes = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Si la línea contiene un = y no estamos en medio de un valor entre comillas
      if (trimmed.includes('=') && !inQuotes) {
        // Guardar el valor anterior si existe
        if (currentKey) {
          process.env[currentKey] = currentValue.trim();
          currentValue = '';
        }
        
        const equalIndex = trimmed.indexOf('=');
        currentKey = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // Verificar si comienza con comillas
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
          process.env[currentKey] = value;
          currentKey = null;
        } else if (value.startsWith('"') || value.startsWith("'")) {
          inQuotes = true;
          currentValue = value.substring(1);
        } else {
          process.env[currentKey] = value;
          currentKey = null;
        }
      } else if (inQuotes) {
        // Continuar leyendo el valor
        if (trimmed.endsWith('"') || trimmed.endsWith("'")) {
          currentValue += '\n' + trimmed.slice(0, -1);
          process.env[currentKey] = currentValue.trim();
          currentKey = null;
          currentValue = '';
          inQuotes = false;
        } else {
          currentValue += '\n' + trimmed;
        }
      }
    }
    
    // Guardar el último valor si existe
    if (currentKey) {
      process.env[currentKey] = currentValue.trim();
    }
  }
}

loadEnv();

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.error('   Asegúrate de tener .env.local con:');
    console.error('   - FIREBASE_PROJECT_ID');
    console.error('   - FIREBASE_CLIENT_EMAIL');
    console.error('   - FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  try {
    const email = 'admin@autodealers.com';
    const password = 'Admin123456';
    const name = 'Administrador';

    console.log('🔍 Verificando si el usuario ya existe...');

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('✅ Usuario ya existe:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Usuario no existe, creándolo...');
        
        // Crear usuario en Firebase Auth
        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
        });
        console.log('✅ Usuario creado en Firebase Auth:', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Verificar si existe en Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      console.log('📝 Creando documento en Firestore...');
      await db.collection('users').doc(userRecord.uid).set({
        email,
        name,
        role: 'admin',
        status: 'active',
        membershipId: '',
        membershipType: 'dealer',
        settings: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Documento creado en Firestore');
    } else {
      console.log('✅ Documento ya existe en Firestore');
    }

    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
    });
    console.log('✅ Custom claims establecidos');

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ USUARIO ADMIN CREADO/VERIFICADO');
    console.log('═══════════════════════════════════════════════\n');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 UID:', userRecord.uid);
    console.log('\n✅ Ya puedes iniciar sesión en el panel admin\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    console.error(error);
    process.exit(1);
  }
}

createAdminUser();

