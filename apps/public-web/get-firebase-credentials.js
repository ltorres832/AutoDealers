// Script interactivo para obtener credenciales de Firebase
const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔐 OBTENER CREDENCIALES DE FIREBASE\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📋 PASO 1: Abrir Firebase Console');
  console.log('   URL: https://console.firebase.google.com');
  console.log('\n   Presiona ENTER cuando hayas abierto Firebase Console...');
  await question('');
  
  console.log('\n📋 PASO 2: Seleccionar el Proyecto');
  console.log('   - Busca y selecciona el proyecto: autodealers-7f62e');
  console.log('   - Si no lo ves, créalo primero');
  console.log('\n   Presiona ENTER cuando hayas seleccionado el proyecto...');
  await question('');
  
  console.log('\n📋 PASO 3: Ir a Cuentas de Servicio');
  console.log('   - Haz clic en el ícono de ⚙️ (Configuración) en la parte superior');
  console.log('   - Selecciona "Configuración del proyecto"');
  console.log('   - Ve a la pestaña "Cuentas de servicio"');
  console.log('\n   Presiona ENTER cuando estés en Cuentas de servicio...');
  await question('');
  
  console.log('\n📋 PASO 4: Generar Nueva Clave Privada');
  console.log('   - Haz clic en "Generar nueva clave privada"');
  console.log('   - Confirma la acción');
  console.log('   - Se descargará un archivo JSON automáticamente');
  console.log('\n   Presiona ENTER cuando hayas descargado el archivo JSON...');
  await question('');
  
  console.log('\n📋 PASO 5: Ubicación del Archivo JSON');
  console.log('   El archivo JSON se descargó en tu carpeta de Descargas');
  console.log('   Nombre del archivo: autodealers-7f62e-xxxxx-firebase-adminsdk-xxxxx.json');
  console.log('\n   ¿Dónde está el archivo JSON?');
  console.log('   1. En la carpeta de Descargas (por defecto)');
  console.log('   2. En otra ubicación (especificar ruta)');
  
  const location = await question('\n   Opción (1 o 2): ');
  
  let jsonPath;
  if (location === '1') {
    const os = require('os');
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const files = fs.readdirSync(downloadsPath).filter(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));
    
    if (files.length === 0) {
      console.log('\n   ❌ No se encontró el archivo JSON en Descargas');
      jsonPath = await question('   Ingresa la ruta completa del archivo JSON: ');
    } else if (files.length === 1) {
      jsonPath = path.join(downloadsPath, files[0]);
      console.log(`\n   ✅ Archivo encontrado: ${files[0]}`);
    } else {
      console.log('\n   Se encontraron múltiples archivos JSON:');
      files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
      const fileIndex = await question('\n   Selecciona el número del archivo: ');
      jsonPath = path.join(downloadsPath, files[parseInt(fileIndex) - 1]);
    }
  } else {
    jsonPath = await question('   Ingresa la ruta completa del archivo JSON: ');
  }
  
  // Leer el archivo JSON
  try {
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    const projectId = jsonContent.project_id;
    const clientEmail = jsonContent.client_email;
    const privateKey = jsonContent.private_key;
    
    console.log('\n✅ Credenciales extraídas exitosamente!\n');
    
    // Crear el archivo .env.local
    const envPath = path.join(__dirname, '.env.local');
    const envContent = `# Firebase Admin SDK Credentials
# Generado automáticamente el ${new Date().toLocaleString()}

FIREBASE_PROJECT_ID=${projectId}
FIREBASE_CLIENT_EMAIL=${clientEmail}
FIREBASE_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"
`;
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Archivo .env.local creado exitosamente!');
    console.log(`   Ubicación: ${envPath}\n`);
    
    console.log('📋 Credenciales configuradas:');
    console.log(`   FIREBASE_PROJECT_ID: ${projectId}`);
    console.log(`   FIREBASE_CLIENT_EMAIL: ${clientEmail}`);
    console.log(`   FIREBASE_PRIVATE_KEY: ${privateKey.substring(0, 50)}...`);
    
    console.log('\n🔄 PRÓXIMOS PASOS:');
    console.log('   1. Reinicia el servidor Next.js');
    console.log('   2. Accede a: http://localhost:3000/demo');
    console.log('   3. El tenant demo se creará automáticamente\n');
    
  } catch (error) {
    console.error('\n❌ Error al leer el archivo JSON:', error.message);
    console.log('\n💡 Puedes crear el archivo .env.local manualmente con:');
    console.log(`   FIREBASE_PROJECT_ID=${jsonContent?.project_id || 'tu-project-id'}`);
    console.log(`   FIREBASE_CLIENT_EMAIL=${jsonContent?.client_email || 'tu-client-email'}`);
    console.log(`   FIREBASE_PRIVATE_KEY="${jsonContent?.private_key?.replace(/\n/g, '\\n') || 'tu-private-key'}"`);
  }
  
  rl.close();
}

main().catch(console.error);


