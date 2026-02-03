// Script completo de verificación de Firebase Admin
const fs = require('fs');
const path = require('path');

console.log('\n🔍 VERIFICACIÓN COMPLETA DE FIREBASE ADMIN\n');
console.log('═══════════════════════════════════════════════════════════\n');

const envPath = path.join(__dirname, '.env.local');
const rootEnvPath = path.join(__dirname, '..', '..', '.env.local');

let issues = [];
let warnings = [];

// 1. Verificar existencia de .env.local
console.log('📁 PASO 1: Verificar archivo .env.local');
console.log('─────────────────────────────────────────────────────────');

if (fs.existsSync(envPath)) {
  console.log(`✅ Archivo encontrado: ${envPath}`);
} else if (fs.existsSync(rootEnvPath)) {
  console.log(`⚠️  Archivo encontrado en raíz: ${rootEnvPath}`);
  console.log(`   (Debería estar en: ${envPath})`);
  warnings.push('El archivo .env.local está en la raíz del proyecto, no en apps/public-web/');
} else {
  console.log(`❌ Archivo NO encontrado en: ${envPath}`);
  issues.push('El archivo .env.local no existe');
}

// 2. Leer y verificar variables
console.log('\n🔐 PASO 2: Verificar variables de entorno');
console.log('─────────────────────────────────────────────────────────');

let envContent = '';
let hasProjectId = false;
let hasClientEmail = false;
let hasPrivateKey = false;
let projectId = '';
let clientEmail = '';
let privateKey = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync(rootEnvPath)) {
  envContent = fs.readFileSync(rootEnvPath, 'utf8');
}

if (envContent) {
  // Buscar variables
  const projectIdMatch = envContent.match(/FIREBASE_PROJECT_ID\s*=\s*(.+)/);
  const clientEmailMatch = envContent.match(/FIREBASE_CLIENT_EMAIL\s*=\s*(.+)/);
  const privateKeyMatch = envContent.match(/FIREBASE_PRIVATE_KEY\s*=\s*["']([^"']+)["']/s);
  
  if (projectIdMatch) {
    projectId = projectIdMatch[1].trim();
    hasProjectId = true;
    console.log(`✅ FIREBASE_PROJECT_ID: ${projectId}`);
  } else {
    console.log('❌ FIREBASE_PROJECT_ID: NO encontrado');
    issues.push('FIREBASE_PROJECT_ID no está definido');
  }
  
  if (clientEmailMatch) {
    clientEmail = clientEmailMatch[1].trim();
    hasClientEmail = true;
    console.log(`✅ FIREBASE_CLIENT_EMAIL: ${clientEmail}`);
  } else {
    console.log('❌ FIREBASE_CLIENT_EMAIL: NO encontrado');
    issues.push('FIREBASE_CLIENT_EMAIL no está definido');
  }
  
  if (privateKeyMatch) {
    privateKey = privateKeyMatch[1].replace(/\\n/g, '\n');
    hasPrivateKey = true;
    console.log(`✅ FIREBASE_PRIVATE_KEY: Encontrado (${privateKey.length} caracteres)`);
    
    // Validar formato de clave privada
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
      console.log('⚠️  FIREBASE_PRIVATE_KEY: El formato puede ser incorrecto');
      warnings.push('La clave privada puede no tener el formato correcto');
    }
  } else {
    console.log('❌ FIREBASE_PRIVATE_KEY: NO encontrado');
    issues.push('FIREBASE_PRIVATE_KEY no está definido');
  }
} else {
  console.log('❌ No se pudo leer el contenido del archivo .env.local');
  issues.push('No se puede leer el archivo .env.local');
}

// 3. Verificar variables en process.env (si el servidor está corriendo)
console.log('\n🌐 PASO 3: Verificar variables en process.env');
console.log('─────────────────────────────────────────────────────────');

const envProjectId = process.env.FIREBASE_PROJECT_ID;
const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (envProjectId) {
  console.log(`✅ FIREBASE_PROJECT_ID en process.env: ${envProjectId}`);
} else {
  console.log('⚠️  FIREBASE_PROJECT_ID NO está en process.env');
  warnings.push('Las variables no están cargadas en process.env (reinicia el servidor)');
}

if (envClientEmail) {
  console.log(`✅ FIREBASE_CLIENT_EMAIL en process.env: ${envClientEmail}`);
} else {
  console.log('⚠️  FIREBASE_CLIENT_EMAIL NO está en process.env');
}

if (envPrivateKey) {
  console.log(`✅ FIREBASE_PRIVATE_KEY en process.env: Encontrado (${envPrivateKey.length} caracteres)`);
} else {
  console.log('⚠️  FIREBASE_PRIVATE_KEY NO está en process.env');
}

// 4. Intentar inicializar Firebase Admin
console.log('\n🔥 PASO 4: Intentar inicializar Firebase Admin');
console.log('─────────────────────────────────────────────────────────');

if (hasProjectId && hasClientEmail && hasPrivateKey) {
  try {
    // Simular la inicialización sin realmente hacerlo (para evitar efectos secundarios)
    const admin = require('firebase-admin');
    
    // Verificar si ya está inicializado
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin ya está inicializado');
      console.log(`   Proyecto: ${admin.app().options.projectId || 'N/A'}`);
    } else {
      // Intentar inicializar con las credenciales
      try {
        const serviceAccount = {
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        };
        
        // Solo validar, no inicializar realmente
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
          throw new Error('Credenciales incompletas');
        }
        
        // Validar formato de clave privada
        if (!serviceAccount.privateKey.includes('BEGIN PRIVATE KEY')) {
          throw new Error('Formato de clave privada inválido');
        }
        
        console.log('✅ Credenciales válidas (formato correcto)');
        console.log('   Nota: No se inicializa realmente para evitar efectos secundarios');
      } catch (error) {
        console.log(`❌ Error al validar credenciales: ${error.message}`);
        issues.push(`Error de credenciales: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`⚠️  No se pudo verificar Firebase Admin: ${error.message}`);
    warnings.push(`No se pudo verificar Firebase Admin: ${error.message}`);
  }
} else {
  console.log('⚠️  No se puede verificar Firebase Admin (faltan credenciales)');
}

// 5. Resumen y recomendaciones
console.log('\n📊 RESUMEN');
console.log('─────────────────────────────────────────────────────────');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ TODO ESTÁ CORRECTO');
  console.log('\n   Firebase Admin debería funcionar correctamente.');
  console.log('   Si aún hay errores, reinicia el servidor Next.js.');
} else {
  if (issues.length > 0) {
    console.log('\n❌ PROBLEMAS ENCONTRADOS:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }
  
  console.log('\n💡 SOLUCIÓN:');
  console.log('─────────────────────────────────────────────────────────');
  
  if (!fs.existsSync(envPath)) {
    console.log('\n1. Crear archivo .env.local:');
    console.log(`   Ubicación: ${envPath}`);
    console.log('\n2. Agregar las siguientes variables:');
    console.log('   FIREBASE_PROJECT_ID=autodealers-7f62e');
    console.log('   FIREBASE_CLIENT_EMAIL=tu-client-email@project.iam.gserviceaccount.com');
    console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    console.log('\n3. O ejecutar el script automático:');
    console.log('   node apps/public-web/get-firebase-credentials.js');
  } else if (issues.some(i => i.includes('NO encontrado'))) {
    console.log('\n1. Verificar que las variables estén en .env.local');
    console.log('2. Reiniciar el servidor Next.js');
    console.log('3. Verificar que no haya espacios o caracteres especiales');
  } else {
    console.log('\n1. Reiniciar el servidor Next.js');
    console.log('2. Verificar que las credenciales sean correctas');
    console.log('3. Ejecutar: node apps/public-web/check-firebase.js');
  }
}

console.log('\n═══════════════════════════════════════════════════════════\n');


