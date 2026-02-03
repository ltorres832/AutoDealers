const admin = require('firebase-admin');
const https = require('https');

// Inicializar Firebase Admin
const serviceAccount = require('./.env.local.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function checkAuth() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICANDO CONFIGURACIÓN DE FIREBASE AUTH');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Verificar que el usuario admin existe
    const user = await admin.auth().getUserByEmail('admin@autodealers.com');
    console.log('✅ Usuario admin existe');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email verificado: ${user.emailVerified}`);

    // Intentar generar un custom token (esto confirma que Firebase Admin funciona)
    const customToken = await admin.auth().createCustomToken(user.uid);
    console.log('\n✅ Firebase Admin SDK funciona correctamente');
    console.log(`   Custom Token generado: ${customToken.substring(0, 20)}...`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  PROBLEMA IDENTIFICADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('El método de autenticación Email/Password NO está habilitado');
    console.log('en la consola de Firebase.\n');
    console.log('📋 SOLUCIÓN - Sigue estos pasos:\n');
    console.log('1. Ve a: https://console.firebase.google.com/project/autodealers-7f62e/authentication/providers');
    console.log('2. Busca "Correo electrónico/contraseña" o "Email/Password"');
    console.log('3. Click en el proveedor');
    console.log('4. ACTIVA el botón "Habilitar"');
    console.log('5. Guarda los cambios\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Alternativamente, usar custom token para login
    console.log('🔧 ALTERNATIVA: Usa custom token authentication\n');
    console.log('Presiona ENTER para generar un enlace de login directo...');
    
    process.stdin.once('data', async () => {
      console.log('\n🔑 Generando enlace de login...\n');
      const token = await admin.auth().createCustomToken(user.uid);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ CUSTOM TOKEN GENERADO');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Custom Token:');
      console.log(token);
      console.log('\nUsa este token en: http://localhost:3001/login-with-token?token=' + token);
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles completos:', error);
    process.exit(1);
  }
}

checkAuth();


