// Script para probar acceso a Firestore desde la app pública
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de Firebase Admin...\n');

// Leer .env.local manualmente
let projectId, clientEmail, privateKey;
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('FIREBASE_PROJECT_ID=')) {
      projectId = line.split('=')[1].trim();
    } else if (line.startsWith('FIREBASE_CLIENT_EMAIL=')) {
      clientEmail = line.split('=')[1].trim();
    } else if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
      privateKey = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    }
  }
} catch (error) {
  console.error('❌ Error leyendo .env.local:', error.message);
  process.exit(1);
}

console.log('Variables de entorno:');
console.log(`  FIREBASE_PROJECT_ID: ${projectId ? '✅' : '❌'}`);
console.log(`  FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅' : '❌'}`);
console.log(`  FIREBASE_PRIVATE_KEY: ${privateKey ? '✅' : '❌'}\n`);

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltan variables de entorno. Verifica .env.local');
  process.exit(1);
}

// Inicializar Firebase Admin
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin inicializado\n');
  } else {
    console.log('✅ Firebase Admin ya estaba inicializado\n');
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

// Probar acceso a Firestore
const db = admin.firestore();

async function testFirestoreAccess() {
  console.log('🧪 Probando acceso a Firestore...\n');

  try {
    // Test 1: Leer un tenant
    console.log('1️⃣ Probando lectura de tenants...');
    const tenantsSnapshot = await db.collection('tenants').limit(1).get();
    console.log(`   ✅ Lectura exitosa: ${tenantsSnapshot.size} tenant(s) encontrado(s)\n`);

    // Test 2: Leer usuarios
    console.log('2️⃣ Probando lectura de users...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log(`   ✅ Lectura exitosa: ${usersSnapshot.size} usuario(s) encontrado(s)\n`);

    // Test 3: Leer vehículos (collectionGroup)
    console.log('3️⃣ Probando lectura de vehicles (collectionGroup)...');
    const vehiclesSnapshot = await db.collectionGroup('vehicles').limit(1).get();
    console.log(`   ✅ Lectura exitosa: ${vehiclesSnapshot.size} vehículo(s) encontrado(s)\n`);

    // Test 4: Leer chat público (si existe un tenant)
    if (tenantsSnapshot.size > 0) {
      const tenantId = tenantsSnapshot.docs[0].id;
      console.log(`4️⃣ Probando lectura de public_chat_messages para tenant: ${tenantId}...`);
      const chatSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .limit(1)
        .get();
      console.log(`   ✅ Lectura exitosa: ${chatSnapshot.size} mensaje(s) encontrado(s)\n`);
    }

    console.log('✅ Todos los tests pasaron. Firestore está accesible.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en test de Firestore:', error);
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testFirestoreAccess();

