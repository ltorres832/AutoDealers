// Script para verificar la configuración de Firebase
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de Firebase...\n');

const envPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, '.env.example');

// Verificar si existe .env.local
if (fs.existsSync(envPath)) {
  console.log('✅ Archivo .env.local encontrado');
  
  // Leer el archivo
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Verificar variables
  const hasProjectId = envContent.includes('FIREBASE_PROJECT_ID=');
  const hasClientEmail = envContent.includes('FIREBASE_CLIENT_EMAIL=');
  const hasPrivateKey = envContent.includes('FIREBASE_PRIVATE_KEY=');
  
  console.log('\nVariables encontradas:');
  console.log(`  FIREBASE_PROJECT_ID: ${hasProjectId ? '✅' : '❌'}`);
  console.log(`  FIREBASE_CLIENT_EMAIL: ${hasClientEmail ? '✅' : '❌'}`);
  console.log(`  FIREBASE_PRIVATE_KEY: ${hasPrivateKey ? '✅' : '❌'}`);
  
  if (!hasProjectId || !hasClientEmail || !hasPrivateKey) {
    console.log('\n⚠️  Faltan algunas variables de entorno');
    console.log('   Asegúrate de que todas las variables estén configuradas en .env.local');
  } else {
    console.log('\n✅ Todas las variables están presentes');
  }
} else {
  console.log('❌ Archivo .env.local NO encontrado');
  console.log('\n📝 Para crear el archivo:');
  console.log('   1. Crea un archivo llamado .env.local en apps/public-web/');
  console.log('   2. Agrega las siguientes variables:');
  console.log('');
  console.log('   FIREBASE_PROJECT_ID=tu-project-id');
  console.log('   FIREBASE_CLIENT_EMAIL=tu-client-email');
  console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  console.log('');
  console.log('   Nota: El FIREBASE_PRIVATE_KEY debe estar entre comillas y con \\n para los saltos de línea');
}

// Verificar si existe .env.example
if (fs.existsSync(envExamplePath)) {
  console.log('\n📄 Archivo .env.example encontrado (puedes usarlo como referencia)');
}

console.log('\n💡 Si las variables están configuradas pero aún hay problemas:');
console.log('   - Reinicia el servidor Next.js después de crear/modificar .env.local');
console.log('   - Verifica que las credenciales sean correctas');
console.log('   - Asegúrate de que el servicio de cuenta de Firebase Admin esté habilitado');


