/**
 * Script para asignar tenantId a un seller existente
 * Ejecutar: node apps/admin/fix-seller-tenant.js [email]
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

async function fixSellerTenant() {
  try {
    const email = process.argv[2] || 'vendedor@test.com';
    
    console.log(`🔍 Buscando usuario: ${email}...`);
    
    // Obtener usuario por email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('✅ Usuario encontrado:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error('❌ Usuario no encontrado');
        process.exit(1);
      }
      throw error;
    }
    
    // Obtener documento del usuario en Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      console.error('❌ Documento del usuario no existe en Firestore');
      process.exit(1);
    }
    
    const userData = userDoc.data();
    
    // Si ya tiene tenantId, verificar que el tenant existe
    if (userData?.tenantId) {
      const tenantDoc = await db.collection('tenants').doc(userData.tenantId).get();
      if (tenantDoc.exists) {
        console.log('✅ Usuario ya tiene tenantId:', userData.tenantId);
        console.log('✅ Tenant existe y está correcto');
        process.exit(0);
      } else {
        console.log('⚠️ Tenant no existe, creando uno nuevo...');
      }
    }
    
    // Crear o obtener tenant para el seller
    let tenantId = userData?.tenantId;
    
    if (!tenantId) {
      console.log('📝 Creando tenant para el seller...');
      
      // Crear tenant
      const tenantRef = db.collection('tenants').doc();
      tenantId = tenantRef.id;
      
      await tenantRef.set({
        name: userData?.name || 'Seller Tenant',
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
    
    // Actualizar usuario con tenantId
    console.log('📝 Actualizando usuario con tenantId...');
    await db.collection('users').doc(userRecord.uid).update({
      tenantId: tenantId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Actualizar custom claims
    console.log('📝 Actualizando custom claims...');
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'seller',
      tenantId: tenantId,
    });
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ TENANT ASIGNADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════\n');
    console.log('📧 Email:', email);
    console.log('🆔 UID:', userRecord.uid);
    console.log('🏢 Tenant ID:', tenantId);
    console.log('\n✅ El usuario ahora puede usar las integraciones sociales\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixSellerTenant();

