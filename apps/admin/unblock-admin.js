/**
 * Script para desbloquear el usuario admin
 * Ejecutar: node apps/admin/unblock-admin.js
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
      
      if (trimmed.includes('=') && !inQuotes) {
        if (currentKey) {
          process.env[currentKey] = currentValue.trim();
          currentValue = '';
        }
        
        const equalIndex = trimmed.indexOf('=');
        currentKey = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
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
    
    if (currentKey) {
      process.env[currentKey] = currentValue.trim();
    }
  }
}

loadEnv();

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/^["']|["']$/g, '');
  }
  
  const serviceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Error: Variables de entorno no configuradas');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function unblockAdmin() {
  try {
    const email = 'admin@autodealers.com';
    
    console.log('🔍 Buscando usuario admin...');
    const user = await auth.getUserByEmail(email);
    console.log(`✅ Usuario encontrado: ${user.uid}`);
    
    // Desbloquear en Firebase Auth
    if (user.disabled) {
      console.log('🔓 Desbloqueando usuario en Firebase Auth...');
      await auth.updateUser(user.uid, { disabled: false });
      console.log('✅ Usuario desbloqueado en Firebase Auth');
    } else {
      console.log('✅ Usuario ya está habilitado en Firebase Auth');
    }
    
    // Verificar/actualizar estado en Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.status !== 'active') {
        console.log('🔓 Actualizando estado en Firestore...');
        await db.collection('users').doc(user.uid).update({
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Estado actualizado en Firestore');
      } else {
        console.log('✅ Usuario ya está activo en Firestore');
      }
    } else {
      console.log('📝 Creando documento en Firestore...');
      await db.collection('users').doc(user.uid).set({
        email,
        name: 'Administrador',
        role: 'admin',
        status: 'active',
        membershipId: '',
        membershipType: 'dealer',
        settings: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Documento creado en Firestore');
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ USUARIO ADMIN DESBLOQUEADO');
    console.log('═══════════════════════════════════════════════\n');
    console.log('📧 Email:', email);
    console.log('🆔 UID:', user.uid);
    console.log('✅ Estado: Activo\n');
    console.log('🚀 Ya puedes iniciar sesión\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

unblockAdmin();


