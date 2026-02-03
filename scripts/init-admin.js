#!/usr/bin/env node

/**
 * Script para crear el primer usuario administrador
 * Uso: node scripts/init-admin.js <email> <password> <name>
 */

const admin = require('firebase-admin');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function initAdmin() {
  try {
    // Inicializar Firebase Admin
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // Obtener datos del usuario
    const email = process.argv[2] || (await question('Email del administrador: '));
    const password = process.argv[3] || (await question('Contraseña: '));
    const name = process.argv[4] || (await question('Nombre: '));

    if (!email || !password || !name) {
      console.error('Error: Email, contraseña y nombre son requeridos');
      process.exit(1);
    }

    // Crear usuario en Firebase Auth
    console.log('Creando usuario en Firebase Auth...');
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      customClaims: {
        role: 'admin',
      },
    });

    // Crear documento en Firestore
    console.log('Creando documento en Firestore...');
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

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log(`   ID: ${userRecord.uid}`);
    console.log(`   Email: ${email}`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

initAdmin();





