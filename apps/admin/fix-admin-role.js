/**
 * Script para verificar y corregir el rol de admin de un usuario
 * Uso: node apps/admin/fix-admin-role.js [email]
 */

const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=');
        // Manejar valores entre comillas
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Manejar valores multilínea (para claves privadas)
        if (key.includes('PRIVATE_KEY')) {
          value = value.replace(/\\n/g, '\n');
        }
        envVars[key.trim()] = value;
      }
    }
  });
}

// Configurar variables de entorno
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
});

const admin = require('firebase-admin');

async function fixAdminRole() {
  try {
    // Inicializar Firebase Admin
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

    // Obtener email del argumento o usar el default
    const email = process.argv[2] || 'admin@autodealers.com';

    console.log(`🔍 Buscando usuario: ${email}`);

    // Buscar usuario por email
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ Usuario encontrado: ${user.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error(`❌ Usuario no encontrado: ${email}`);
        console.log('💡 Creando usuario...');
        
        // Crear usuario
        user = await auth.createUser({
          email,
          password: 'Admin123456',
          displayName: 'Administrador',
        });

        // Crear documento en Firestore
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

        // Establecer custom claims
        await auth.setCustomUserClaims(user.uid, {
          role: 'admin',
        });

        console.log(`✅ Usuario creado con rol de admin: ${user.uid}`);
        return;
      } else {
        throw error;
      }
    }

    // Verificar rol en Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      console.log('⚠️ Usuario no tiene documento en Firestore, creándolo...');
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        name: user.displayName || 'Administrador',
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
      const userData = userDoc.data();
      console.log(`📋 Rol actual en Firestore: ${userData.role || 'NO DEFINIDO'}`);
      
      if (userData.role !== 'admin') {
        console.log('⚠️ Rol incorrecto, corrigiéndolo...');
        await db.collection('users').doc(user.uid).update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Rol actualizado a "admin" en Firestore');
      } else {
        console.log('✅ Rol correcto en Firestore');
      }
    }

    // Verificar y actualizar custom claims
    const customClaims = user.customClaims || {};
    console.log(`📋 Custom claims actuales:`, customClaims);
    
    if (customClaims.role !== 'admin') {
      console.log('⚠️ Custom claims incorrectos, corrigiéndolos...');
      await auth.setCustomUserClaims(user.uid, {
        ...customClaims,
        role: 'admin',
      });
      console.log('✅ Custom claims actualizados');
    } else {
      console.log('✅ Custom claims correctos');
    }

    // Verificar si el usuario está deshabilitado
    if (user.disabled) {
      console.log('⚠️ Usuario está deshabilitado, habilitándolo...');
      await auth.updateUser(user.uid, { disabled: false });
      console.log('✅ Usuario habilitado');
    }

    console.log('');
    console.log('✅ PROCESO COMPLETADO');
    console.log('');
    console.log('📋 Resumen:');
    console.log(`   - Usuario: ${user.email}`);
    console.log(`   - UID: ${user.uid}`);
    console.log(`   - Rol en Firestore: admin`);
    console.log(`   - Custom Claims: admin`);
    console.log(`   - Estado: ${user.disabled ? 'deshabilitado' : 'activo'}`);
    console.log('');
    console.log('💡 IMPORTANTE:');
    console.log('   El usuario debe cerrar sesión y volver a iniciar sesión');
    console.log('   para que los cambios en custom claims surtan efecto.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixAdminRole().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

