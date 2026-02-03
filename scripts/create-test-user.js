#!/usr/bin/env node

/**
 * Script para crear usuarios de prueba
 * Uso: node scripts/create-test-user.js <email> <password> <name> <role> [tenantId] [dealerId]
 * 
 * Ejemplos:
 * - node scripts/create-test-user.js seller@test.com password123 "Vendedor Test" seller
 * - node scripts/create-test-user.js dealer@test.com password123 "Dealer Test" dealer
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Configurar readline para entrada interactiva
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function initFirebase() {
  // Inicializar Firebase Admin
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      // Si no hay credenciales, intentar con Application Default Credentials
      try {
        admin.initializeApp();
      } catch (err) {
        console.error('Error inicializando Firebase Admin:', err.message);
        console.error('Asegúrate de tener configuradas las variables de entorno:');
        console.error('  - FIREBASE_PROJECT_ID');
        console.error('  - FIREBASE_CLIENT_EMAIL');
        console.error('  - FIREBASE_PRIVATE_KEY');
        process.exit(1);
      }
    }
  }
}

async function createTestUser() {
  try {
    await initFirebase();

    const db = admin.firestore();
    const auth = admin.auth();

    // Obtener datos del usuario
    const email = process.argv[2] || (await question('Email del usuario: '));
    const password = process.argv[3] || (await question('Contraseña: '));
    const name = process.argv[4] || (await question('Nombre: '));
    const role = process.argv[5] || (await question('Rol (dealer/seller): '));
    const tenantId = process.argv[6] || (await question('Tenant ID (opcional, presiona Enter para crear uno nuevo): '));
    const dealerId = process.argv[7] || (role === 'seller' ? (await question('Dealer ID (opcional para sellers): ')) : '');

    if (!email || !password || !name || !role) {
      console.error('Error: Email, contraseña, nombre y rol son requeridos');
      process.exit(1);
    }

    if (role !== 'dealer' && role !== 'seller') {
      console.error('Error: El rol debe ser "dealer" o "seller"');
      process.exit(1);
    }

    // Verificar si el usuario ya existe
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log(`⚠️  El usuario con email ${email} ya existe en Firebase Auth`);
      console.log(`   ID: ${existingUser.uid}`);
      
      const userDoc = await db.collection('users').doc(existingUser.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log(`   Rol: ${userData.role}`);
        console.log(`   Estado: ${userData.status}`);
        console.log(`   Tenant ID: ${userData.tenantId || 'N/A'}`);
      }
      
      const overwrite = await question('¿Deseas actualizar la contraseña? (s/n): ');
      if (overwrite.toLowerCase() === 's') {
        await auth.updateUser(existingUser.uid, { password });
        console.log('✅ Contraseña actualizada');
      }
      
      rl.close();
      process.exit(0);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Crear o obtener tenant
    let finalTenantId = tenantId;
    if (!finalTenantId) {
      console.log('Creando tenant...');
      const tenantRef = db.collection('tenants').doc();
      await tenantRef.set({
        name: name,
        type: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      finalTenantId = tenantRef.id;
      console.log(`✅ Tenant creado: ${finalTenantId}`);
    }

    // Crear usuario en Firebase Auth
    console.log('Creando usuario en Firebase Auth...');
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      tenantId: finalTenantId,
      dealerId: dealerId || undefined,
    });

    // Crear documento en Firestore
    console.log('Creando documento en Firestore...');
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role,
      tenantId: finalTenantId,
      dealerId: dealerId || undefined,
      membershipId: '',
      membershipType: role,
      status: 'active',
      settings: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('\n✅ Usuario creado exitosamente!');
    console.log(`   ID: ${userRecord.uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Nombre: ${name}`);
    console.log(`   Rol: ${role}`);
    console.log(`   Tenant ID: ${finalTenantId}`);
    if (dealerId) {
      console.log(`   Dealer ID: ${dealerId}`);
    }
    console.log('\nAhora puedes iniciar sesión con estas credenciales.');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    rl.close();
    process.exit(1);
  }
}

createTestUser();


