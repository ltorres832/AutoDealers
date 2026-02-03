/**
 * Script para crear un vendedor de prueba
 * Ejecutar: node apps/admin/create-test-seller.js
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

async function createTestSeller() {
  try {
    const email = 'vendedor@test.com';
    const password = 'Vendedor123456';
    const name = 'Vendedor de Prueba';
    
    console.log('🔍 Verificando si el vendedor ya existe...');
    
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('✅ Vendedor ya existe:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Creando vendedor de prueba...');
        
        // Crear usuario en Firebase Auth
        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
        });
        console.log('✅ Vendedor creado en Firebase Auth:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    // Verificar si existe en Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    // Verificar si tiene tenantId, si no, crear uno
    let tenantId = userDoc.exists ? userDoc.data()?.tenantId : null;
    
    if (!tenantId) {
      console.log('📝 Creando tenant para el seller...');
      const tenantRef = db.collection('tenants').doc();
      tenantId = tenantRef.id;
      
      await tenantRef.set({
        name: name,
        type: 'seller',
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
        },
        settings: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Tenant creado:', tenantId);
    }
    
    if (!userDoc.exists) {
      console.log('📝 Creando documento en Firestore...');
      await db.collection('users').doc(userRecord.uid).set({
        email,
        name,
        role: 'seller',
        tenantId: tenantId,
        status: 'active',
        membershipId: '',
        membershipType: 'seller',
        settings: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Documento creado en Firestore');
    } else {
      // Actualizar estado a activo y tenantId si falta
      const userData = userDoc.data();
      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (userData?.status !== 'active') {
        updates.status = 'active';
      }
      
      if (!userData?.tenantId) {
        updates.tenantId = tenantId;
      }
      
      if (Object.keys(updates).length > 1) {
        await db.collection('users').doc(userRecord.uid).update(updates);
        console.log('✅ Usuario actualizado en Firestore');
      } else {
        console.log('✅ Documento ya existe en Firestore');
      }
    }
    
    // Desbloquear en Firebase Auth si está bloqueado
    if (userRecord.disabled) {
      await auth.updateUser(userRecord.uid, { disabled: false });
      console.log('✅ Vendedor desbloqueado en Firebase Auth');
    }
    
    // Establecer custom claims con tenantId
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'seller',
      tenantId: tenantId,
    });
    console.log('✅ Custom claims establecidos con tenantId:', tenantId);
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ VENDEDOR DE PRUEBA CREADO/VERIFICADO');
    console.log('═══════════════════════════════════════════════\n');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 UID:', userRecord.uid);
    console.log('\n🚀 Para acceder al dashboard:');
    console.log('   1. Inicia el servidor: cd apps/seller && npm run dev');
    console.log('   2. Accede a: http://localhost:3003');
    console.log('   3. Inicia sesión con las credenciales de arriba\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

createTestSeller();


